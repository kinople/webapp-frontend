import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";

const CreateOrganization = () => {
	const { user } = useParams();
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		organizationname: "",
		description: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.organizationname.trim()) {
			setError("Organization name is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Prepare data according to backend expectations
			const requestData = {
				organizationname: formData.organizationname.trim(),
				organizationdetails: {
					description: formData.description.trim() || "",
				},
			};

			const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations`), {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to create organization");
			}

			const data = await response.json();

						if (data.status === "success") {
				// Force a page reload to refresh the navbar and all components
				navigate(`/${user}`, { state: { create_org: "success" } });
			} else {
				throw new Error(data.message || "Failed to create organization");
			}
		} catch (err) {
			setError(err.message);
			console.error("Error creating organization:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		navigate(`/${user}`);
	};

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>Create New Organization</h1>
				<p style={styles.subtitle}>Set up a new organization to collaborate with your team</p>
			</div>

			<div style={styles.formContainer}>
				<form onSubmit={handleSubmit} style={styles.form}>
					{error && <div style={styles.errorMessage}>{error}</div>}

					<div style={styles.inputGroup}>
						<label htmlFor="organizationname" style={styles.label}>
							Organization Name *
						</label>
						<input
							type="text"
							id="organizationname"
							name="organizationname"
							value={formData.organizationname}
							onChange={handleInputChange}
							placeholder="Enter organization name"
							style={styles.input}
							disabled={loading}
							required
						/>
					</div>

					<div style={styles.inputGroup}>
						<label htmlFor="description" style={styles.label}>
							Description
						</label>
						<textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleInputChange}
							placeholder="Brief description of your organization (optional)"
							style={styles.textarea}
							disabled={loading}
							rows={4}
						/>
					</div>

					<div style={styles.buttonGroup}>
						<button type="button" onClick={handleCancel} style={styles.cancelButton} disabled={loading}>
							Cancel
						</button>
						<button type="submit" style={loading ? styles.submitButtonDisabled : styles.submitButton} disabled={loading}>
							{loading ? "Creating..." : "Create Organization"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const styles = {
	container: {
		marginLeft: "250px", // Account for navbar width
		padding: "2rem",
		minHeight: "100vh",
		backgroundColor: "#f8f9fa",
	},
	header: {
		marginBottom: "2rem",
		textAlign: "center",
	},
	title: {
		fontSize: "2rem",
		fontWeight: "bold",
		color: "#333",
		margin: "0 0 0.5rem 0",
	},
	subtitle: {
		fontSize: "1.1rem",
		color: "#666",
		margin: 0,
	},
	formContainer: {
		maxWidth: "600px",
		margin: "0 auto",
		backgroundColor: "white",
		borderRadius: "8px",
		padding: "2rem",
		boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: "1.5rem",
	},
	errorMessage: {
		backgroundColor: "#fee",
		color: "#c33",
		padding: "1rem",
		borderRadius: "6px",
		border: "1px solid #fcc",
		fontSize: "0.9rem",
	},
	inputGroup: {
		display: "flex",
		flexDirection: "column",
		gap: "0.5rem",
	},
	label: {
		fontSize: "1rem",
		fontWeight: "500",
		color: "#333",
	},
	input: {
		padding: "0.75rem",
		border: "1px solid #ddd",
		borderRadius: "6px",
		fontSize: "1rem",
		transition: "border-color 0.2s",
		outline: "none",
	},
	textarea: {
		padding: "0.75rem",
		border: "1px solid #ddd",
		borderRadius: "6px",
		fontSize: "1rem",
		transition: "border-color 0.2s",
		outline: "none",
		resize: "vertical",
		fontFamily: "inherit",
	},
	buttonGroup: {
		display: "flex",
		gap: "1rem",
		justifyContent: "flex-end",
		marginTop: "1rem",
	},
	cancelButton: {
		padding: "0.75rem 1.5rem",
		backgroundColor: "#f8f9fa",
		color: "#666",
		border: "1px solid #ddd",
		borderRadius: "6px",
		cursor: "pointer",
		fontSize: "1rem",
		fontWeight: "500",
		transition: "background-color 0.2s",
	},
	submitButton: {
		padding: "0.75rem 1.5rem",
		backgroundColor: "#4B9CD3",
		color: "white",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
		fontSize: "1rem",
		fontWeight: "500",
		transition: "background-color 0.2s",
	},
	submitButtonDisabled: {
		padding: "0.75rem 1.5rem",
		backgroundColor: "#ccc",
		color: "#666",
		border: "none",
		borderRadius: "6px",
		cursor: "not-allowed",
		fontSize: "1rem",
		fontWeight: "500",
	},
};

export default CreateOrganization;
