import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';
import _ from 'lodash';
import Expenses from './visualizations/Expenses';

import expensesData from './data/expenses.json';

var width = 900;

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {expenses: []};
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

    this.setState({expenses});
  }

  render() {
    var props = {
      width,
    };

    return (
      <Expenses {...props} {...this.state} />
    );
  }
}

export default App;
