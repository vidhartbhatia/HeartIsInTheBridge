import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SmoothieComponent from 'react-smoothie';

class StreamingChart extends Component {

  static defaultProps = {
    active: true
  };

  constructor(props) {
    super(props);
    this.chart = React.createRef();
    this.tss = [];
    this.state = {
      width: 400
    };
  }

  addTimeSeries(params) {
    const ts = this.chart.current.addTimeSeries({}, params);
    this.tss.push(ts);
    return ts;
  }

  UNSAFE_componentWillUpdate(nextProps) {
    if (nextProps.active && !this.props.active) {
      this.tss.forEach((ts) => ts.data = []);
      this.chart.current.smoothie.start();
    } else if (!nextProps.active && this.props.active) {
      this.chart.current.smoothie.stop();
    }
  }

  componentDidMount() {
    const parent = ReactDOM.findDOMNode(this.chart.current).parentNode;
    var chartWidth = parent.clientWidth;
    const cs = getComputedStyle(parent);
    chartWidth -= parseFloat(cs.paddingLeft);
    chartWidth -= parseFloat(cs.paddingRight);
    chartWidth -= parseFloat(cs.borderLeftWidth);
    chartWidth -= parseFloat(cs.borderRightWidth);
    this.setState({width: chartWidth});
  }

  yrange(range) {
    const max = 5;
    const min = 0.1;
    const curRange = Math.max(Math.abs(range.min), Math.abs(range.max));
    const newRange = Math.max(min, Math.min(max, curRange));
    return {
      min: -newRange,
      max: +newRange
    };
  }

  render() {
    return (
      <SmoothieComponent
        ref={this.chart}
        width={this.state.width}
        height={75}
        grid={{
          strokeStyle: '#00000000',
          fillStyle: '#00000000',
          verticalSections: 0,
          borderVisible: false,
          labels: {
            disabled: true
          }
        }}
        labels={{
          fillStyle: '#00000000'
        }}
        millisPerPixel={5}
        interpolation={'linear'}
        yRangeFunction={this.yrange}
      />
    );
  }

}

export default StreamingChart;
