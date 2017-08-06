import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';
import _ from 'lodash';
import Expenses from './visualizations/Expenses';
import Categories from './visualizations/Categories';

import expensesData from './data/expenses.json';

var width = 900;
var height = 1800;

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      expenses: [],
      selectedWeek: null,
    };

    this.prevWeek = this.prevWeek.bind(this);
    this.nextWeek = this.nextWeek.bind(this);
  }

  componentWillMount() {
    // process data
    var expenses = _.chain(expensesData)
      .filter(d => d.Amount < 0)
      .map(d => {
        return {
          amount: -d.Amount,
          name: d.Description,
          date: new Date(d['Trans Date']),
        }
      }).value();

    // default selected week will be the most recent week
    var selectedWeek = d3.max(expenses, exp => d3.timeWeek.floor(exp.date));

    this.setState({expenses, selectedWeek});
  }

  prevWeek() {
    // todo: error handling
    var selectedWeek = d3.timeWeek.offset(this.state.selectedWeek, -1);
    this.setState({selectedWeek});
  }

  nextWeek() {
    // todo: error handling
    var selectedWeek = d3.timeWeek.offset(this.state.selectedWeek, 1);
    this.setState({selectedWeek});
  }

  render() {
    var props = {
      width,
    };
    var selectedWeek = d3.timeFormat('%B %d, %Y')(this.state.selectedWeek);

    return (
      <div className='App'>
        <h2>
        <span onClick={this.prevWeek}>←</span>
        Week of {selectedWeek}
        <span onClick={this.nextWeek}>→</span>
        </h2>
        <svg width={width} height={height}>
          <Expenses {...props} {...this.state} />
          <Categories {...props} {...this.state} />
        </svg>
      </div>
    );
  }
}

export default App;
