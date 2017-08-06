import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
