import React, { Component } from 'react';

class ImageCanvas extends Component {

  static defaultProps = {
    frame: null,
    width: 30,
    height: 30
  };

  constructor(props) {
    super(props);
    this.canvas = React.createRef();
  }

  UNSAFE_componentWillUpdate(nextProps) {
    this
      .canvas
      .current
      .getContext('2d')
      .putImageData(nextProps.frame, 0, 0);
  }

  render() {
    return (
      <canvas
        ref={this.canvas}
        width={this.props.width}
        height={this.props.height}
      />
    );
  }

}

export default ImageCanvas;
