import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';

var expenses = [
  {
    name: 'Coffee',
    amount: 4,
    date: new Date()
  }, {
    name: 'Safeway',
    amount: 46,
    date: new Date()
  },
  {
    name: 'Valero',
    amount: 40,
    date: new Date()
  }
]

var width = 900;
var height = 900;
var radius = 20;
var simulation = d3.forceSimulation()
  .force('center', d3.forceCenter(width / 2, height / 2))
  // .force('charge', d3.forceManyBody())
  .force('collide', d3.forceCollide(radius))
  .stop();

class App extends Component {

  constructor(props) {
    super(props);

    this.forceTick = this.forceTick.bind(this);
  }

  componentWillMount() {
    simulation.on('tick', this.forceTick);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container);
    this.renderCircles();

    simulation.nodes(expenses).alpha(0.9).restart();
  }

  componentDidUpdate() {
    this.renderCircles();
  }

  renderCircles() {
    // draw expenses circles
    this.circles = this.container.selectAll('circle')
      .data(expenses, d => d.name);

    // exit
    this.circles.exit().remove();

    // enter+update
    this.circles = this.circles.enter().append('circle')
      .merge(this.circles)
      .attr('r', radius)
      .attr('opacity', 0.5);
  }

  forceTick() {
    console.log(this.circles.datum().x, this.circles.datum().y)
    this.circles.attr('cx', d => d.x)
      .attr('cy', d => d.y);
  }

  render() {
    return (
      <svg width={width} height={height} ref='container'>

      </svg>
    );
  }
}

export default App;
