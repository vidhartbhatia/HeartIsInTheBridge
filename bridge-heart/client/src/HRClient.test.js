import React from 'react';
import ReactDOM from 'react-dom';
import HRClient from './HRClient';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<HRClient />, div);
  ReactDOM.unmountComponentAtNode(div);
});
