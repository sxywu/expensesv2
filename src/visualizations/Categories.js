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
    this.categories = _.map(this.props.categories, category => {
      var x = this.props.width / 2;
      var y = height / 3;
      var fill = category.total ?
        colorScale(amountScale(category.total)) : this.props.colors.gray;
      return Object.assign(category, {
        fill,
        radius,
        focusX: x,
        focusY: y,
        x: category.x || x,
        y: category.y || y,
      });
    });
  }

  renderLinks() {
    this.lines = this.container.selectAll('line')
      .data(this.props.links);

    // exit
    this.lines.exit().remove();

    // enter + update
    this.lines = this.lines.enter().insert('line', 'g')
      .attr('stroke', this.props.colors.black)
      .attr('stroke-width', 2)
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
      .attr('stroke-width', 2);
    enter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', white)
      .attr('font-size', 14);

    // enter + update selection
    this.circles = enter.merge(this.circles);
    this.circles.select('circle')
      .transition(t)
      .attr('fill', d => d.fill);
    this.circles.select('text')
      .text(d => d.name);
  }

  forceTick() {
    this.circles.attr('transform', d => 'translate(' + [d.x, d.y] + ')');
    this.lines.attr('x1', d => d.source.x)
      .attr('x2', d => d.target.x)
      .attr('y1', d => d.source.y)
      .attr('y2', d => d.target.y);
  }

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
