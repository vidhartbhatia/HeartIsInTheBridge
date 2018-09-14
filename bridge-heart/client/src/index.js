import React from 'react';
import ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css';
import './index.css';
import HRClient from './HRClient';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<HRClient />, document.querySelector('#root'));
registerServiceWorker();
