import React, { Component } from 'react';
import { Button, Container, Grid, Icon, Loader, Statistic, Transition } from 'semantic-ui-react';
import io from 'socket.io-client';
import PageVisibility from 'react-page-visibility';
import BridgeSim from './BridgeSim';
import HeartRate from './HeartRate';
import StreamingChart from './StreamingChart';
import { toRGBString } from './util';

class HRClient extends Component {

  static SERVER = 'https://api.bridge.kevinzheng.com:43414/';

  constructor(props) {
    super(props);
    this.chart = React.createRef();
    this.state = {
      active: true,
      connected: false,
      beatCount: 0,
      measurement: {
        time: 0,
        hr: 0,
        value: 0,
        frame: null,
        rgb: {
          r: 0,
          g: 0,
          b: 0
        }
      },
      camera: {
        torch: false,
        back: true
      },
      bridge: [ ],
      selfIdx: -1
    };
  }

  componentDidMount() {
    document.title = 'My <3 is in the bridge';
    this.signal0 = this.chart.current.addTimeSeries({
      strokeStyle: 'rgba(0, 0, 0, 1)',
      lineWidth: 2,
    });
    if (this.state.active) {
      this.setUpSocket();
    }
  }

  componentWillUnmount() {
    if (this.socket) {
      this.tearDownSocket();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.active && !this.state.active) {
      this.tearDownSocket();
    } else if (!prevState.active && this.state.active) {
      this.setUpSocket();
    }
  }

  setUpSocket = () => {
    this.socket = io(HRClient.SERVER);
    this.socket.on('connect', () => { this.setState({connected: true}); });
    this.socket.on('disconnect', () => { this.setState({connected: false}); });
    this.socket.on('colors', this.onNetworkColor);
    this.socket.on('beat', this.onNetworkBeat);
    this.socket.on('self_index', this.onSelfIndex);
  }

  tearDownSocket = () => {
    this.socket.disconnect();
    delete this.socket;
  }

  onPageVisibility = visible => {
    if (!visible) {
      this.setState({ active: false });
    }
  }

  onBeat = (time) => {
    if (this.state.connected) {
      this.socket.emit('beat', time);
    }
    this.setState({ beatCount: this.state.beatCount + 1 });
  }
  
  onData = (measurement) => {
    this.signal0.append(measurement.time, measurement.value);
    this.setState({ measurement: measurement });
  }

  onNetworkColor = (newColors) => {
    var newBridge = [];
    for (var i = 0; i < newColors.length; i++) {
      newBridge.push({
        color: {
          r: newColors[i] === null ? 0 : newColors[i][0],
          g: newColors[i] === null ? 0 : newColors[i][1],
          b: newColors[i] === null ? 0 : newColors[i][2],
        },
        lastBeat: this.state.bridge.length === newColors.length ? this.state.bridge[i].lastBeat : 0,
        present: newColors[i] !== null
      });
    }
    this.setState({ bridge: newBridge });
  }

  onNetworkBeat = (beatIdx) => {
    var newBridge = [];
    for (var i = 0; i < this.state.bridge.length; i++) {
      newBridge.push({
        color: {
          r: this.state.bridge[i].color.r,
          g: this.state.bridge[i].color.g,
          b: this.state.bridge[i].color.b,
        },
        lastBeat: i === beatIdx ? Date.now() : this.state.bridge[i].lastBeat,
        present: this.state.bridge[i].present
      });
    }
    this.setState({ bridge: newBridge });
  }

  onSelfIndex = (idx) => {
    this.setState({ selfIdx: idx });
  }

  render() {
    return (
      <div>
        <Container>
          <Grid centered columns={1}>
            <Grid.Row>
              <Grid.Column>
                <BridgeSim bridge={this.state.bridge} selfIdx={this.state.selfIdx} />
              </Grid.Column>
            </Grid.Row>

            <Grid.Row>
              <Grid.Column>
                <StreamingChart ref={this.chart} active={this.state.active} />
              </Grid.Column>
            </Grid.Row>

            <Grid.Row>
              <Grid.Column textAlign='center'>
                <Statistic>
                  <Statistic.Value>
                    {Math.round(this.state.measurement.hr)}
                  </Statistic.Value>
                  <Statistic.Label>
                    BPM
                  </Statistic.Label>
                </Statistic>
              </Grid.Column>
            </Grid.Row>

            <Grid.Row>
              <Grid.Column textAlign='center'>
                <Transition animation='pulse' duration={250} visible={this.state.beatCount % 2 === 0}>
                  <Icon.Group size='massive'>
                    <Icon name='heart' style={{color: toRGBString(this.state.measurement.rgb)}} />
                  </Icon.Group>
                </Transition>
              </Grid.Column>
            </Grid.Row>

            <Grid.Row>
              <Grid.Column textAlign='center'>
                <Button
                  onClick={() => this.setState({camera: {torch: !this.state.camera.torch}})}
                  basic
                  circular
                  toggle
                  active={this.state.camera.torch}
                  icon
                  size={'massive'}
                  disabled={!this.state.active}
                >
                  <Icon name='lightbulb' />
                </Button>

                <Button
                  onClick={() => this.setState({active: !this.state.active})}
                  basic
                  circular
                  toggle
                  active={this.state.active}
                  icon
                  size={'massive'}
                >
                  <Icon name={this.state.active ? 'pause' : 'play'} />
                </Button>
              </Grid.Column>
            </Grid.Row>

            <Transition visible={this.state.active && !this.state.connected} animation='scale' duration={500}>
              <Grid.Row>
                <Grid.Column textAlign='center'>
                  <Loader active={true} inline>
                    Connecting
                  </Loader>
                </Grid.Column>
              </Grid.Row>
            </Transition>

          </Grid>
        </Container>

        <PageVisibility onChange={this.onPageVisibility} />

        { this.state.active &&
        <HeartRate
          onBeat={this.onBeat}
          onData={this.onData}
          camTorch={this.state.camera.torch}
          camBack={this.state.camera.back}
        /> }
      </div>
    );
  }

}

export default HRClient;
