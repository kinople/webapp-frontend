// Organization Slice - Global organization state management

const initialState = {
	currentOrganization: {
		id: null,
		name: "Personal",
	},
	organizations: [],
	loading: false,
};

// Action types
export const SET_CURRENT_ORGANIZATION = "organization/setCurrentOrganization";
export const SET_ORGANIZATIONS = "organization/setOrganizations";
export const SET_ORGANIZATIONS_LOADING = "organization/setOrganizationsLoading";

// Action creators
export const setCurrentOrganization = (organization) => ({
	type: SET_CURRENT_ORGANIZATION,
	payload: organization,
});

export const setOrganizations = (organizations) => ({
	type: SET_ORGANIZATIONS,
	payload: organizations,
});

export const setOrganizationsLoading = (loading) => ({
	type: SET_ORGANIZATIONS_LOADING,
	payload: loading,
});

// Reducer
const organizationReducer = (state = initialState, action) => {
	switch (action.type) {
		case SET_CURRENT_ORGANIZATION:
			return {
				...state,
				currentOrganization: action.payload,
			};
		case SET_ORGANIZATIONS:
			return {
				...state,
				organizations: action.payload,
			};
		case SET_ORGANIZATIONS_LOADING:
			return {
				...state,
				loading: action.payload,
			};
		default:
			return state;
	}
};

export default organizationReducer;

