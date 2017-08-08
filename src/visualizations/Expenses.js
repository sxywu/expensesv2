import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

import chroma from 'chroma-js';

var height = 600;
var margin = {left: 60, top: 20, right: 40, bottom: 20};
var radius = 7;

// d3 functions
var daysOfWeek = [[0, 'S'], [1, 'M'], [2, 'T'], [3, 'W'], [4, 'Th'], [5, 'F'], [6, 'S']];
var xScale = d3.scaleLinear().domain([0, 6]);
var yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
var colorScale = chroma.scale(['#53cf8d', '#f7d283', '#e85151']);
var amountScale = d3.scaleLog();
var simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  // .force('charge', d3.forceManyBody(-10))
  .force('collide', d3.forceCollide(radius))
  .force('x', d3.forceX(d => d.focusX))
  .force('y', d3.forceY(d => d.focusY))
  .stop();
var drag = d3.drag();

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {};
    this.forceTick = this.forceTick.bind(this);
    this.dragStart = this.dragStart.bind(this);
    this.dragExpense = this.dragExpense.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
  }

  componentWillMount() {
    xScale.range([margin.left, this.props.width - margin.right]);
    simulation.on('tick', this.forceTick);
    drag.on('start', this.dragStart)
      .on('drag', this.dragExpense)
      .on('end', this.dragEnd);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container);
    this.calculateData();
    this.renderWeeks();
    this.renderDays();
    this.renderCircles();

    simulation.nodes(this.props.expenses).alpha(0.9).restart();
  }

  componentDidUpdate() {
    this.calculateData();
    this.renderCircles();

    simulation.nodes(this.props.expenses).alpha(0.9).restart();
  }

  calculateData() {
    var weeksExtent = d3.extent(this.props.expenses,
      d => d3.timeWeek.floor(d.date));
    yScale.domain(weeksExtent);

    var perAngle = Math.PI / 6;
    var selectedWeekRadius = (this.props.width - margin.left - margin.right) / 2;

    // rectangle for each week
    var weeks = d3.timeWeek.range(weeksExtent[0], d3.timeWeek.offset(weeksExtent[1], 1));
    this.weeks = _.map(weeks, week => {
      return {
        week,
        x: margin.left,
        y: yScale(week) + height,
      }
    });

    // circles for the back of each day in semi-circle
    this.days = _.map(daysOfWeek, date => {
      var [dayOfWeek, name] = date;
      var angle = Math.PI - perAngle * dayOfWeek;
      var x = selectedWeekRadius * Math.cos(angle) + this.props.width / 2;
      var y = selectedWeekRadius * Math.sin(angle) + margin.top;
      return {
        name,
        x, y,
      }
    });

    this.expenses = _.chain(this.props.expenses)
      .groupBy(d => d3.timeWeek.floor(d.date))
      .map((expenses, week) => {
        week = new Date(week);
        return _.map(expenses, exp => {
          var dayOfWeek = exp.date.getDay();
          var focusX = xScale(dayOfWeek);
          var focusY = yScale(week) + height;

          if (week.getTime() === this.props.selectedWeek.getTime()) {
            var angle = Math.PI - perAngle * dayOfWeek;

            focusX = selectedWeekRadius * Math.cos(angle) + this.props.width / 2;
            focusY = selectedWeekRadius * Math.sin(angle) + margin.top;
          }

          return Object.assign(exp, {
            focusX,
            focusY,
          });
        });
      }).flatten().value()

    var amountExtent = d3.extent(this.expenses, d => d.amount);
    amountScale.domain(amountExtent);
  }

  renderCircles() {
    // draw expenses circles
    this.circles = this.container.selectAll('.expense')
      .data(this.expenses, d => d.name);

    // exit
    this.circles.exit().remove();

    // enter+update
    this.circles = this.circles.enter().append('circle')
      .classed('expense', true)
      .attr('r', radius)
      .attr('fill-opacity', 0.25)
      .attr('stroke-width', 3)
      .call(drag)
      .merge(this.circles)
      .attr('fill', d => colorScale(amountScale(d.amount)))
      .attr('stroke', d => colorScale(amountScale(d.amount)));
  }

  renderDays() {
    var days = this.container.selectAll('.day')
      .data(this.days, d => d.name)
      .enter().append('g')
      .classed('day', true)
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')');

    var daysRadius = 80;
    var fontSize = 12;
    days.append('circle')
      .attr('r', daysRadius)
      .attr('fill', '#ccc')
      .attr('opacity', 0.25);

    days.append('text')
      .attr('y', daysRadius + fontSize)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#999')
      .style('font-weight', 600)
      .text(d => d.name);
  }

  renderWeeks() {
    var weeks = this.container.selectAll('.week')
      .data(this.weeks, d => d.name)
      .enter().append('g')
      .classed('week', true)
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')');

    var rectHeight = 10;
    weeks.append('rect')
      .attr('y', -rectHeight / 2)
      .attr('width', this.props.width - margin.left - margin.right)
      .attr('height', rectHeight)
      .attr('fill', '#ccc')
      .attr('opacity', 0.25);

    var weekFormat = d3.timeFormat('%m/%d');
    weeks.append('text')
      .attr('text-anchor', 'end')
      .attr('dy', '.35em')
      .attr('fill', '#999')
      .style('font-weight', 600)
      .text(d => weekFormat(d.week))
  }

  forceTick() {
    this.circles.attr('cx', d => d.x)
      .attr('cy', d => d.y);
  }

  dragStart() {
    simulation.alphaTarget(0.3).restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  }

  dragExpense() {
    this.dragged = null;

    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;

    var expense = d3.event.subject;
    var expenseX = d3.event.x;
    var expenseY = d3.event.y;
    _.each(this.props.categories, category => {
      var {x, y, radius} = category;
      if (x - radius / 2 < expenseX && expenseX < x + radius / 2 &&
        y - radius / 2 < expenseY && expenseY < y + radius / 2) {
          this.dragged = {expense, category};
        }
    });
  }

  dragEnd() {
    if (!d3.event.active) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;

    if (this.dragged) {
      var {expense, category} = this.dragged;
      this.props.linkToCategory(expense, category);
    }
    this.dragged = null;
  }

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
