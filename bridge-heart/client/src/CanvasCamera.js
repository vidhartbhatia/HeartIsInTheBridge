import React, { Component } from 'react';
import WebRTCWebcam from './WebRTCWebcam';

class CanvasCamera extends Component {

  static defaultProps = {
    debug: false,
    onNewFrame: (canvas) => { },
    frameRate: 30,
    camTorch: false,
    camBack: true
  };

  static FRAME_WIDTH = 30;
  static FRAME_HEIGHT = 30;

  constructor(props) {
    super(props);
    this.cam = React.createRef();
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', CanvasCamera.FRAME_WIDTH);
    this.canvas.setAttribute('height', CanvasCamera.FRAME_HEIGHT);
    this.state = {
      torchAvailable: false,
    };
  }

  componentDidMount() {
    this.startService()
  }

  componentWillUnmount() {
    this.stopService();
  }

  startService = () => {
    if (typeof this.timerID !== 'undefined') {
      throw new Error('Service already started');
    }
    this.timerID = setInterval(this.processFrame, 1000/this.props.frameRate);
  }

  stopService = () => {
    if (typeof this.timerID === 'undefined') {
      throw new Error('Service not started');
    }
    clearInterval(this.timerID);
    delete this.timerID;
  }

  processFrame = () => {
    const ctx = this.canvas.getContext('2d');
    this.cam.current.drawOnCanvas(ctx, 0, 0, this.canvas.width, this.canvas.height);
    setTimeout(this.props.onNewFrame(this.canvas));
  }

  onCapabilities = (capabilities) => {
    var torchAvailable = false;
    if (typeof capabilities.torch === 'boolean') {
      torchAvailable = capabilities.torch;
    }
    this.setState({torchAvailable: torchAvailable});
  }

  render() {
    const debugInfo = {
      state: this.state,
      props: this.props
    };

    return (
      <div>
        <div className='row' hidden={!this.props.debug}>
          <div className='col-xs-12'>
            <pre>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>

        <WebRTCWebcam
          video={true}
          audio={false}
          videoSource={this.props.camBack ? 'environment' : 'user'}
          torch={this.props.camTorch}
          onCapabilities={this.onCapabilities}
          style={{display: 'none'}}
          ref={this.cam}
        />
      </div>
    );
  }

}

export default CanvasCamera;
