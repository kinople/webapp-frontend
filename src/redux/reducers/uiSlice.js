// UI Slice - Global UI state management

const initialState = {
	navbarCollapsed: false,
};

// Action types
export const TOGGLE_NAVBAR = "ui/toggleNavbar";
export const SET_NAVBAR_COLLAPSED = "ui/setNavbarCollapsed";

// Action creators
export const toggleNavbar = () => ({
	type: TOGGLE_NAVBAR,
});

export const setNavbarCollapsed = (collapsed) => ({
	type: SET_NAVBAR_COLLAPSED,
	payload: collapsed,
});

// Reducer
const uiReducer = (state = initialState, action) => {
	switch (action.type) {
		case TOGGLE_NAVBAR:
			return {
				...state,
				navbarCollapsed: !state.navbarCollapsed,
			};
		case SET_NAVBAR_COLLAPSED:
			return {
				...state,
				navbarCollapsed: action.payload,
			};
		default:
			return state;
	}
};

export default uiReducer;
