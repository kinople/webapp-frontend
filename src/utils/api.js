import { getAuthHeaders } from "./auth";

// Environment-based API URL configuration
const getBaseApiUrl = () => {
	// Check if we're in development mode
	if (process.env.NODE_ENV === "development") {
		return "http://127.0.0.1:5000";
	}

	// Production URL
	return process.env.API_URL || "https://fnki5rlndb.execute-api.us-east-1.amazonaws.com";
};

const API_URL = getBaseApiUrl();

// Function to build the full API URL
export const getApiUrl = (path) => {
	console.log(`API URL: ${API_URL}${path}`); // Debug log to see which URL is being used
	return `${API_URL}${path}`;
};

export const fetchWithAuth = async (url, options = {}) => {
	const defaultOptions = {
		mode: "cors",
		credentials: process.env.NODE_ENV === "development" ? "include" : "omit", // Include credentials for local development
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders(), // Add auth headers automatically
		},
	};

	try {
		console.log(`Making request to: ${url}`); // Debug log
		const response = await fetch(url, {
			...defaultOptions,
			...options,
			headers: {
				...defaultOptions.headers,
				...options.headers,
			},
		});

		console.log("Response status:", response.status);
		return response;
	} catch (error) {
		console.error("Fetch error:", error);
		throw error;
	}
};
