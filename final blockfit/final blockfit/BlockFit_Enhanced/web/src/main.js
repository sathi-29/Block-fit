import './style.css';
import { startApp } from './app.js';
import { installErrorTracking, track } from './analytics.js';

installErrorTracking();
track('app_opened');
startApp();
