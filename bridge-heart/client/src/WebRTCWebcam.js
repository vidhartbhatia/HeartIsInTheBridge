import React, { Component } from 'react';
import PropTypes from 'prop-types';

function hasGetUserMedia() {
  return !!(
    navigator.mediaDevices.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia
  );
}

export default class Webcam extends Component {
  static defaultProps = {
    audio: true,
    className: '',
    height: 480,
    onUserMedia: () => {},
    onCapabilities: (_) => {},
    screenshotFormat: 'image/webp',
    width: 640,
    videoSource: 'user',
    torch: false
  };

  static propTypes = {
    audio: PropTypes.bool,
    onUserMedia: PropTypes.func,
    onCapabilities: PropTypes.func,
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    screenshotFormat: PropTypes.oneOf([
      'image/webp',
      'image/png',
      'image/jpeg',
    ]),
    style: PropTypes.object,
    className: PropTypes.string,
    audioSource: PropTypes.string,
    videoSource: PropTypes.string,
    torch: PropTypes.bool
  };

  static mountedInstances = [];

  static userMediaRequested = false;

  constructor() {
    super();
    this.state = {
      hasUserMedia: false,
    };
  }

  componentDidMount() {
    if (!hasGetUserMedia()) return;

    Webcam.mountedInstances.push(this);

    if (!this.state.hasUserMedia && !Webcam.userMediaRequested) {
      this.requestUserMedia();
    }
  }

  componentWillUpdate(nextProps) {
    if (
      nextProps.videoSource !== this.props.videoSource ||
      nextProps.audioSource !== this.props.audioSource
    ) {
      this.requestUserMedia();
    }
    if (nextProps.torch !== this.props.torch) {
      this.setTorch(nextProps.torch);
    }
  }

  componentWillUnmount() {
    const index = Webcam.mountedInstances.indexOf(this);
    Webcam.mountedInstances.splice(index, 1);

    if (Webcam.mountedInstances.length === 0 && this.state.hasUserMedia) {
      if (this.stream.stop) {
        this.stream.stop();
      } else {
        if (this.stream.getVideoTracks) {
          this.stream.getVideoTracks().map(track => track.stop());
        }
        if (this.stream.getAudioTracks) {
          this.stream.getAudioTracks().map(track => track.stop());
        }
      }
      Webcam.userMediaRequested = false;
      window.URL.revokeObjectURL(this.state.src);
    }
  }

  setTorch(state) {
    const track = this.stream.getTracks()[0];
    if (track.getCapabilities().torch) {
      this.stream.getTracks()[0].applyConstraints({
        advanced: [{torch: state}]
      });
    }
  }

  getScreenshot() {
    if (!this.state.hasUserMedia) return null;

    const canvas = this.getCanvas();
    return canvas && canvas.toDataURL(this.props.screenshotFormat);
  }

  getCanvas() {
    if (!this.state.hasUserMedia || !this.video.videoHeight) return null;

    if (!this.ctx) {
      const canvas = document.createElement('canvas');
      const aspectRatio = this.video.videoWidth / this.video.videoHeight;

      canvas.width = this.video.clientWidth;
      canvas.height = this.video.clientWidth / aspectRatio;

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }

    const { ctx, canvas } = this;
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  drawOnCanvas(ctx, x, y, w, h) {
    ctx.drawImage(this.video, x, y, w, h);
  }

  requestUserMedia() {
    navigator.getUserMedia =
      navigator.mediaDevices.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    const sourceSelected = (audioSource, videoSource) => {
      const constraints = {
        video: {
          facingMode: {
            ideal: videoSource
          }
        },
      };

      if (this.props.audio) {
        constraints.audio = {
          optional: [{ sourceId: audioSource }],
        };
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          Webcam.mountedInstances.forEach(instance =>
            instance.handleUserMedia(null, stream),
          );
        })
        .catch((e) => {
          Webcam.mountedInstances.forEach(instance =>
            instance.handleUserMedia(e),
          );
        });
    };

    if (this.props.audioSource && this.props.videoSource) {
      sourceSelected(this.props.audioSource, this.props.videoSource);
    } else if ('mediaDevices' in navigator) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          let audioSource = null;
          let videoSource = null;

          devices.forEach((device) => {
            if (device.kind === 'audioinput') {
              audioSource = device.id;
            } else if (device.kind === 'videoinput') {
              videoSource = device.id;
            }
          });

          if (this.props.audioSource) {
            audioSource = this.props.audioSource;
          }
          if (this.props.videoSource) {
            videoSource = this.props.videoSource;
          }

          sourceSelected(audioSource, videoSource);
        })
        .catch((error) => {
          console.log(`${error.name}: ${error.message}`); // eslint-disable-line no-console
        });
    } else {
      MediaStreamTrack.getSources((sources) => {
        let audioSource = null;
        let videoSource = null;

        sources.forEach((source) => {
          if (source.kind === 'audio') {
            audioSource = source.id;
          } else if (source.kind === 'video') {
            videoSource = source.id;
          }
        });

        if (this.props.audioSource) {
          audioSource = this.props.audioSource;
        }
        if (this.props.videoSource) {
          videoSource = this.props.videoSource;
        }

        sourceSelected(audioSource, videoSource);
      });
    }

    Webcam.userMediaRequested = true;
  }

  handleUserMedia(error, stream) {
    if (error) {
      this.setState({
        hasUserMedia: false,
      });

      return;
    }
    try {
      this.stream = stream;
      this.video.srcObject = stream;
      setTimeout(() => this.setTorch(this.props.torch), 500);
      this.setState({
        hasUserMedia: true,
      });
    } catch (err) {
      const src = window.URL.createObjectURL(stream);

      this.stream = stream;
      this.setState({
        hasUserMedia: true,
        src,
      });
    }

    this.video.play();
    this.props.onUserMedia();
    setTimeout(() =>
      this.props.onCapabilities(this.stream.getTracks()[0].getCapabilities()),
      500
    );

  }

  render() {
    return (
      <video
        autoPlay
        width={this.props.width}
        height={this.props.height}
        src={this.state.src}
        muted={this.props.audio}
        className={this.props.className}
        playsInline={true}
        style={this.props.style}
        ref={(ref) => {
          this.video = ref;
        }}
      />
    );
  }
}
