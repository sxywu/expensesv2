import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import chroma from 'chroma-js';
import deleteIconSrc from '../images/delete.svg';

var height = 600;
var topPadding = 150;
var radius = 55;
var white = '#fff8fa';
var deleteIconY = 160;
var deleteIconRadius = 24;

var amountScale = d3.scaleLog();
var colorScale = chroma.scale(['#53c3ac', '#f7e883', '#e85178']);
var simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  .force('collide', d3.forceCollide(d => d.radius + 10))
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

    simulation.on('tick', this.forceTick);
    drag.on('start', this.dragStart)
      .on('drag', this.dragExpense)
      .on('end', this.dragEnd);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container);
    // create delete icon
    this.deleteIcon = this.container.append('image')
      .attr('x', this.props.width / 2 - deleteIconRadius)
      .attr('y', deleteIconY - deleteIconRadius)
      .attr('width', 2 * deleteIconRadius)
      .attr('height', 2 * deleteIconRadius)
      .attr('xlink:href', deleteIconSrc)
      .attr('fill', this.props.colors.black)
      .style('display', 'none');

    this.calculateData();
    this.renderLinks();
    this.renderCircles();

    simulation.nodes(this.categories).alpha(0.9).restart();
  }

  componentDidUpdate() {
    this.calculateData();
    this.renderLinks();
    this.renderCircles();

    simulation.nodes(this.categories).alpha(0.9).restart();
  }

  calculateData() {
    var totalsByDay = _.chain(this.props.expenses)
      .groupBy(d => d3.timeDay.floor(d.date))
      .map(expenses => _.sumBy(expenses, 'amount'))
      .value();
    // get min+max total amounts per day
    var totalsExtent = d3.extent(_.values(totalsByDay));
    amountScale.domain(totalsExtent);

    var width = this.props.width;
    this.links = [];
    // calculate existing categories
    this.categories = _.map(this.props.categories, category => {
      var total = 0;
      _.chain(category.expenses)
        .filter(expense => d3.timeWeek.floor(expense.date).getTime() ===
          this.props.selectedWeek.getTime())
        .each(expense => {
          total += expense.amount;
          this.links.push({
            source: expense,
            target: category,
          });
        }).value();

      return Object.assign(category, {
        total,
        fill: colorScale(amountScale(total)),
        radius,
        focusX: width / 2,
        focusY: height / 3 + topPadding,
        x: category.x || _.random(0.25 * width, 0.75 * width),
        y: category.y || _.random(0.25 * height, 0.5 * height),
      });
    });
    // if a category is currently being added, include that also
    if (this.props.categoryBeingAdded) {
      this.categories.push(Object.assign(this.props.categoryBeingAdded, {
        fx: this.props.width / 2,
        fy: 100,
        radius,
      }));
    }

  }

  renderLinks() {
    this.lines = this.container.selectAll('path')
      .data(this.links);

    // exit
    this.lines.exit().remove();

    // enter + update
    this.lines = this.lines.enter().insert('path', 'g')
      .attr('stroke', this.props.colors.black)
      .attr('stroke-width', 0.5)
      .attr('fill', 'none')
      .merge(this.lines);
  }

  renderCircles() {
    var t = d3.transition().duration(500);
    // update
    this.circles = this.container.selectAll('g')
      .data(this.categories);

    // exit
    this.circles.exit().remove();

    // enter
    var enter = this.circles.enter().append('g');
    enter.append('circle')
      .attr('r', radius)
      .attr('stroke-width', 1)
      .style('cursor', 'move')
      .call(drag);
    enter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', 14)
      .style('pointer-events', 'none');

    // enter + update selection
    this.circles = enter.merge(this.circles);
    this.circles.select('circle')
      .transition(t)
      .attr('stroke', d => d.total ? this.props.colors.black : this.props.colors.gray)
      .attr('fill', d => d.total ? d.fill : this.props.colors.gray);
    this.circles.select('text')
      .text(d => d.name)
      .transition(t)
      .attr('fill', d => d.total ? this.props.colors.white : this.props.colors.black);
  }

  forceTick() {
    this.circles.attr('transform', d => 'translate(' + [d.x, d.y] + ')');
    this.lines
      .attr('transform', d => {
        var angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
        angle *= (180 / Math.PI);
        return'translate(' + [d.source.x, d.source.y] + ')rotate(' + angle + ')';
      }).attr('d', d => {
        var direction = d.source.date.getDay() < 3 ? -1 : 1;
        // calculate distance between source and target
        var dist = Math.sqrt(Math.pow(d.target.x - d.source.x, 2) + Math.pow(d.target.y - d.source.y, 2));
        return 'M0,0 Q' + [dist / 2, direction * dist / 3] + ' ' + [dist, 0];
      });
  }

  dragStart() {
    simulation.alphaTarget(0.3).restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;

    this.deleteIcon.style('display', 'block');
  }

  dragExpense() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;
  }

  dragEnd() {
    if (!d3.event.active) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;

    this.deleteIcon.style('display', 'none');

    // if dragged over the deleteIcon
    var categoryX = d3.event.x;
    var categoryY = d3.event.y;
    if (this.props.width / 2 - deleteIconRadius < categoryX &&
      categoryX < this.props.width / 2 + deleteIconRadius &&
      deleteIconY - deleteIconRadius < categoryY &&
      categoryY < deleteIconY + deleteIconRadius) {
      this.props.deleteCategory(d3.event.subject);
    }
  }


  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
