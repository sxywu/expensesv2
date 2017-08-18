import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import chroma from 'chroma-js';

var height = 600;
var radius = 55;
var white = '#fff8fa';

var amountScale = d3.scaleLog();
var colorScale = chroma.scale(['#53c3ac', '#f7e883', '#e85178']);
var simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  .force('collide', d3.forceCollide(d => d.radius + 10))
  .force('x', d3.forceX(d => d.focusX))
  .force('y', d3.forceY(d => d.focusY))
  .stop();

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {};

    this.forceTick = this.forceTick.bind(this);
    simulation.on('tick', this.forceTick);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container);
    this.calculateData();
    this.renderLinks();
    this.renderCircles();

    simulation.nodes(this.props.categories).alpha(0.9).restart();
  }

  componentDidUpdate() {
    this.calculateData();
    this.renderLinks();
    this.renderCircles();

    simulation.nodes(this.props.categories).alpha(0.9).restart();
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
        focusY: height / 3,
        x: category.x || _.random(0.25 * width, 0.75 * width),
        y: category.y || _.random(0.25 * height, 0.5 * height),
      });
    });
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
      .style('cursor', 'move');
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

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
