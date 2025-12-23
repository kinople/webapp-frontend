import { combineReducers } from "redux";
import projectReducer from "./projectSlice";
import uiReducer from "./uiSlice";
import organizationReducer from "./organizationSlice";

const rootReducer = combineReducers({
	project: projectReducer,
	ui: uiReducer,
	organization: organizationReducer,
});

export default rootReducer;
