import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

import chroma from 'chroma-js';

var height = 650;
var margin = {left: 40, top: 20, right: 40, bottom: 20};
var white = '#fff8fa';

// d3 functions
var daysOfWeek = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];
var xScale = d3.scaleLinear().domain([0, 6]);
var yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
var amountScale = d3.scaleLog();
var colorScale = chroma.scale(['#53c3ac', '#f7e883', '#e85178']);

class Day extends Component {

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentWillMount() {
    xScale.range([margin.left, this.props.width - margin.right]);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container);
    this.calculateData();
    this.renderDays();
  }

  componentDidUpdate() {
    this.calculateData();
    this.renderDays();
  }

  calculateData() {
    var weeksExtent = d3.extent(this.props.expenses,
      d => d3.timeWeek.floor(d.date));
    yScale.domain(weeksExtent);

    var perAngle = Math.PI / 12;
    var selectedWeekRadius = this.props.width * 0.55;
    this.totalsByDay = _.chain(this.props.expenses)
      .groupBy(d => d3.timeDay.floor(d.date))
      .reduce((obj, expenses, date) => {
        obj[date] = _.sumBy(expenses, 'amount');
        return obj;
      }, {}).value();
    // get min+max total amounts per day
    var totalsExtent = d3.extent(_.values(this.totalsByDay));
    amountScale.domain(totalsExtent);
    // get min+max dates
    var [minDate, maxDate] = d3.extent(this.props.expenses,
      d => d3.timeDay.floor(d.date));

    this.days = _.map(d3.timeDay.range(minDate, maxDate), (date) => {
      var total = this.totalsByDay[date] || 1;
      var dayOfWeek = date.getDay();
      var week = d3.timeWeek.floor(date);
      var x = xScale(dayOfWeek);
      var y = yScale(week) + height;

      if (week.getTime() === this.props.selectedWeek.getTime()) {
        var angle = 0.75 * Math.PI - perAngle * dayOfWeek;

        x = selectedWeekRadius * Math.cos(angle) + this.props.width / 2;
        y = selectedWeekRadius * Math.sin(angle) + margin.top;
      }

      return {
        name: daysOfWeek[dayOfWeek],
        date,
        width: 55,
        height: 75,
        fill: colorScale(amountScale(total)),
        x, y,
      };
    });
  }

  renderDays() {
    var t = d3.transition().duration(500);
    var fontSize = 20;

    var days = this.container.selectAll('.day')
      .data(this.days, d => d.date);

    // exit
    days.exit().remove();

    // enter
    var enter = days.enter().append('g')
      .classed('day', true)
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')');
    enter.append('rect')
      // .attr('fill-opacity', 0.75);
    enter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', white)
      .style('font-family', 'CatMule Caps')
      .style('font-size', fontSize);

    days = enter.merge(days);
    days.transition(t)
      .delay((d, i) => d.date.getDay() * 50)
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')');

    days.select('rect')
      .attr('width', d => 2 * d.width)
      .attr('height', d => 2 * d.height)
      .attr('x', d => -d.width)
      .attr('y', d => -d.height)
      .transition(t)
      .attr('fill', d => d.fill);

    var timeFormat = d3.timeFormat('%m/%d');
    days.select('text')
      .attr('y', d => d.height - 0.75 * fontSize)
      .text(d => timeFormat(d.date));
  }

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default Day;
