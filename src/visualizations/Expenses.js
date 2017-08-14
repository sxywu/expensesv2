import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

import chroma from 'chroma-js';

var height = 600;
var margin = {left: 60, top: 20, right: 40, bottom: 20};
var radius = 5;

// d3 functions
var daysOfWeek = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];
var xScale = d3.scaleLinear().domain([0, 6]);
var yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
var amountScale = d3.scaleLinear().range([radius, 4 * radius]);
var colorScale = chroma.scale(['#53cf8d', '#f7d283', '#e85151']);
var simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  .force('collide', d3.forceCollide(d => d.radius + 1))
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
    var amountExtent = d3.extent(this.props.expenses, d => d.amount);
    amountScale.domain(amountExtent);

    var perAngle = Math.PI / 6;
    var selectedWeekRadius = (this.props.width - margin.left - margin.right) / 2;
    this.days = _.chain(this.props.expenses)
      .groupBy(d => d3.timeDay.floor(d.date))
      .map((expenses, date) => {
        date = new Date(date);
        var dayOfWeek = date.getDay();
        var week = d3.timeWeek.floor(date);
        var x = xScale(dayOfWeek);
        var y = yScale(week) + height;

        if (week.getTime() === this.props.selectedWeek.getTime()) {
          var angle = Math.PI - perAngle * dayOfWeek;

          x = selectedWeekRadius * Math.cos(angle) + this.props.width / 2;
          y = selectedWeekRadius * Math.sin(angle) + margin.top;
        }

        return {
          name: daysOfWeek[dayOfWeek],
          date,
          radius: 50,
          x, y,
        };
      }).value();
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
            radius: amountScale(exp.amount),
            focusX,
            focusY,
            x: exp.x || focusX,
            y: exp.y || focusY,
          });
        });
      }).flatten().value()
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
      .attr('fill', '#fff')
      .attr('stroke-width', 1)
      .attr('stroke', '#999')
      .call(drag)
      .merge(this.circles)
      .attr('r', d => d.radius);
  }

  renderDays() {
    var days = this.container.selectAll('.day')
      .data(this.days, d => d.name)
      .enter().append('g')
      .classed('day', true)
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')');

    var fontSize = 12;
    days.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', '#ccc')
      .attr('opacity', 0.25);

    var timeFormat = d3.timeFormat('%m/%d');
    days.append('text')
      .attr('y', d => d.radius + fontSize)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#999')
      .style('font-weight', 600)
      .text(d => timeFormat(d.date));
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
    // go through all categories to see if overlapping
    _.each(this.props.categories, category => {
      var {x, y, radius} = category;
      if (x - radius < expenseX && expenseX < x + radius &&
        y - radius < expenseY && expenseY < y + radius) {
          this.dragged = {expense, category, type: 'category'};
        }
    });
    // go through all the days to see if expense overlaps
    _.each(this.days, day => {
      var {x, y, radius} = day;
      if (x - radius < expenseX && expenseX < x + radius &&
        y - radius < expenseY && expenseY < y + radius) {
          this.dragged = {expense, day, type: 'day'};
        }
    });
  }

  dragEnd() {
    if (!d3.event.active) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;

    if (this.dragged && this.dragged.type === 'category') {
      var {expense, category} = this.dragged;
      this.props.linkToCategory(expense, category);
    } else if (this.dragged && this.dragged.type === 'day') {
      var {expense, day} = this.dragged;
      this.props.editDate(expense, day);
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
