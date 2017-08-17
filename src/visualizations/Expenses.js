import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

var height = 650;
var dayHeight = 75;
var margin = {left: 40, top: 20, right: 40, bottom: 20};
var radius = 5;
var white = '#fff8fa';

// d3 functions
var xScale = d3.scaleLinear().domain([0, 6]);
var yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
var amountScale = d3.scaleLinear().range([radius, 4 * radius]);
var simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  .force('collide', d3.forceCollide(d => d.radius + 2))
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

    var perAngle = Math.PI / 12;
    var selectedWeekRadius = this.props.width * 0.55;
    this.expenses = _.chain(this.props.expenses)
      .groupBy(d => d3.timeWeek.floor(d.date))
      .map((expenses, week) => {
        week = new Date(week);
        return _.map(expenses, exp => {
          var dayOfWeek = exp.date.getDay();
          var week = d3.timeWeek.floor(exp.date);
          var focusX = xScale(dayOfWeek);
          var focusY = yScale(week) + height + 2 * dayHeight;

          if (week.getTime() === this.props.selectedWeek.getTime()) {
            var offset = Math.abs(3 - dayOfWeek);
            focusY = height - 2 * dayHeight - 0.5 * offset * dayHeight;
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
      .attr('fill', white)
      .call(drag)
      .merge(this.circles)
      .attr('r', d => d.radius);
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
