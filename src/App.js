import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';
import _ from 'lodash';
import Expenses from './visualizations/Expenses';
import Day from './visualizations/Day';
import Categories from './visualizations/Categories';

import expensesData from './data/expenses.json';

var width = 750;
var height = 1800;
var colors = {
  white: '#fff8fa',
  gray: '#e1ecea',
  black: '#516561',
};

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      expenses: [],
      categories: [
        {name: 'Restaurants', expenses: [], total: 0},
        {name: 'Travel', expenses: [], total: 0},
        {name: 'Dessert', expenses: [], total: 0},
      ],
      selectedWeek: null,
    };

    this.prevWeek = this.prevWeek.bind(this);
    this.nextWeek = this.nextWeek.bind(this);
    this.linkToCategory = this.linkToCategory.bind(this);
    this.editDate = this.editDate.bind(this);
    this.addCategory = this.addCategory.bind(this);
  }

  componentWillMount() {
    // process data
    var expenses = _.chain(expensesData)
      .filter(d => d.Amount < 0)
      .map((d, i) => {
        return {
          id: i,
          amount: -d.Amount,
          name: d.Description,
          date: new Date(d['Trans Date']),
          categories: 0,
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

  linkToCategory(expense, category) {
    if (_.includes(category.expenses, expense)) {
      category.expenses = _.without(category.expenses, expense);
      expense.categories -= 1;
    } else {
      category.expenses.push(expense);
      expense.categories += 1;
    }
    this.forceUpdate();
  }

  editDate(expense, day) {
    expense.date = day.date;
    this.forceUpdate();
  }

  addCategory(event) {
    var ENTER_CODE = 13;
    if (event.charCode === ENTER_CODE) {
      // take the value of the input and create new category
      var category = {
        name: event.target.value,
        expenses: [],
        total: 0,
      }
      var categories = this.state.categories;
      categories.push(category);
      this.setState({categories});
    }
  }

  render() {
    var selectedWeek = d3.timeFormat('%B %d, %Y')(this.state.selectedWeek);
    var style = {
      width,
      margin: 'auto',
    }
    var svgStyle = {
      overflow: 'visible',
      position: 'absolute',
      top: 0,
      width,
      height,
      zIndex: -1,
    }
    var props = {
      width,
      colors,
      linkToCategory: this.linkToCategory,
      editDate: this.editDate,
    };

    return (
      <div className='App' style={style}>
        <div style={{textAlign: 'center'}}>
          <h2>Add category</h2>
          <input type='text' onKeyPress={this.addCategory}></input>
        </div>
        <h1 style={{textAlign: 'center', color: colors.black}}>
          <span style={{cursor: 'pointer'}} onClick={this.prevWeek}>← </span>
          Week of {selectedWeek}
          <span style={{cursor: 'pointer'}}  onClick={this.nextWeek}> →</span>
        </h1>
        <svg style={svgStyle}>
          <Day {...props} {...this.state} />
          <Categories {...props} {...this.state} />
          <Expenses {...props} {...this.state} />
        </svg>
      </div>
    );
  }
}

export default App;
