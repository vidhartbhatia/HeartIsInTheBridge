import React, { Component } from 'react';
import { Grid } from 'semantic-ui-react';
import { toRGBString } from './util';

class BridgeSim extends Component {

  static defaultProps = {
    bridge: [ ],
    selfIdx: -1
  };

  render() {
    const tiles = this.props.bridge.map((client, i) => (
      <Tile
        key={i}
        present={client.present}
        marked={i === this.props.selfIdx}
        color={client.color}
      />
    ));

    if (this.props.bridge.length > 0) {
      return (
        <Grid divided>
          <Grid.Row columns={this.props.bridge.length}>
            {tiles}
          </Grid.Row>
        </Grid>
      );
    } else {
      return null;
    }
  }

}

class Tile extends Component {
  
  static defaultProps = {
    present: false,
    marked: false,
    color: {
      r: 0,
      g: 0,
      b: 0
    },
  };

  render() {
    return (
      <Grid.Column
        verticalAlign='middle'
        textAlign='center'
        style={{
          backgroundColor: this.props.present ? toRGBString(this.props.color, true) : 'rgb(240,240,240)',
          paddingTop: '10px',
          paddingBottom: '10px'
        }}
      >
        <h1 style={{color:'white'}}>{this.props.marked ? '★' : '\u00A0'}</h1>
      </Grid.Column>
    );
  }

}

export default BridgeSim;
