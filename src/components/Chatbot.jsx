import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loader from "./Loader";
import "../css/Chatbot.css";
import { useState } from "react";
import { getApiUrl } from "../utils/api";

export default function Chatbot({ scheduleData, scheduleDays, scenes, id, fetchScheduleData }) {
	const [chatMessages, setChatMessages] = useState([]);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [chatInput, setChatInput] = useState("");

	const handleSendMessage = async () => {
		if (!chatInput.trim()) return;

		try {
			setIsSendingMessage(true);

			const userMessage = {
				type: "user",
				content: chatInput,
			};
			setChatMessages((prev) => [...prev, userMessage]);

			setChatInput("");

			console.log("chatbot data : ", scheduleData, scheduleDays, scenes);

			const response = await fetch(getApiUrl(`/api/${id}/query`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					question: chatInput,
					schedule: scheduleData,
					scheduleDays: scheduleDays,
					breakdown: scenes,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to process message");
			}

			const result = await response.json();

			console.log("bot ouput: ", result);

			const assistantMessage = {
				type: "assistant",
				content: result.message,
			};
			setChatMessages((prev) => [...prev, assistantMessage]);
			fetchScheduleData();
		} catch (error) {
			console.error("Error sending message:", error);
			const errorMessage = {
				type: "error",
				content: `Error: ${error.message}`,
				timestamp: new Date().toISOString(),
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSendingMessage(false);
		}
	};

	return (
		<div className="right-panel">
			<div className="chatbot-header">Scheduling Assistant</div>
			<div className="chat-container">
				<div className="chat-messages">
					<div className="welcome-message">
						Hello! I'm Kino, your scheduling assistant. I can help you with:
						<ul className="assistant-list">
							<li>Understanding the current schedule</li>
							<li>Suggesting optimal shooting dates</li>
							<li>Adding scheduling constraints</li>
						</ul>
						How can I assist you today?
					</div>
					{chatMessages.map((message, index) => (
						<div
							key={index}
							className={`message-container ${message.type === "user" ? "user-message" : ""} ${
								message.type === "assistant" ? "assistant-message" : ""
							} ${message.type === "error" ? "error-message" : ""}`}
						>
							<div className="message-content">
								<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
							</div>
						</div>
					))}
					{isSendingMessage && (
					<div className="message-container assistant-message loader-container">
						<Loader />
					</div>
				)}
				</div>
				
				<div className="chat-input-container">
					<input
						type="text"
						value={chatInput}
						onChange={(e) => setChatInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
						placeholder="Type your message here..."
						className="chat-input"
						disabled={isSendingMessage}
					/>
					<button
						className={`send-button ${isSendingMessage ? "send-button-disabled" : ""}`}
						onClick={handleSendMessage}
						disabled={isSendingMessage}
					>
						{isSendingMessage ? "Sending..." : "Send"}
					</button>
				</div>
			</div>
		</div>
	);
}
