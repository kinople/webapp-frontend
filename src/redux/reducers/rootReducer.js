import { combineReducers } from 'redux';
import projectReducer from './projectSlice';

const rootReducer = combineReducers({
  project: projectReducer,
});

export default rootReducer;
