import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loader from "./Loader";
import "../css/Chatbot.css";
import { useMemo, useRef, useState } from "react";
import { getApiUrl } from "../utils/api";
import ScheduleSettingsForm from "./ScheduleSettingsForm";

function getAssistantMessageVariant(content) {
	const text = String(content || "");

	if (
		text.includes("Schedule successfully generated") ||
		text.includes("Generation Settings") ||
		text.includes("Before I regenerate") ||
		text.includes("confirm these settings")
	) {
		return "schedule";
	}

	if (text.includes("Conflicts found") || text.includes("check conflicts") || text.includes("scene(s) with conflicts")) {
		return "conflict";
	}

	return "default";
}

function getQuickReplies(message) {
	const text = String(message?.content || "");
	const normalizedText = text.toLowerCase();
	const replies = [];
	const hasForm = message?.ui_action?.action === "RENDER_SCHEDULE_FORM";

	if (text.includes("Before I regenerate") || text.includes("confirm these settings")) {
		if (!hasForm) {
			replies.push({
				label: "Yes, regenerate",
				payload: "Yes, regenerate the schedule with the current settings.",
				actionLabel: "Regenerating schedule...",
			});
		}
		replies.push({
			label: "Check conflicts first",
			payload: "Check conflicts on the current schedule first.",
			actionLabel: "Checking conflicts...",
		});
		replies.push({
			label: "Cancel",
			payload: "Cancel this action. Do not make any schedule changes.",
			actionLabel: "Updating conversation...",
		});
	}

	if (
		normalizedText.includes("before i run the update") ||
		normalizedText.includes("reply “confirm”") ||
		normalizedText.includes("reply \"confirm\"") ||
		normalizedText.includes("please confirm") ||
		normalizedText.includes("reply “yes, update”") ||
		normalizedText.includes("reply \"yes, update\"") ||
		normalizedText.includes("do you want only this one change")
	) {
		replies.push({
			label: "Confirm",
			payload: "Confirm",
			actionLabel: "Updating availability...",
		});
		// Only show "Yes, update" when the LLM is asking about a single change vs multiple
		if (normalizedText.includes("do you want only this one change")) {
			replies.push({
				label: "Yes, update",
				payload: "Yes, update only this one change.",
				actionLabel: "Updating availability...",
			});
		}
		// Only show "Update both dates" when the response involves multiple/both date changes
		if (normalizedText.includes("both") && (normalizedText.includes("date") || normalizedText.includes("unavailable"))) {
			replies.push({
				label: "Update both dates",
				payload: "Update both unavailable dates as requested.",
				actionLabel: "Updating availability...",
			});
		}
		replies.push({
			label: "Cancel",
			payload: "Cancel this update. Do not make any changes.",
			actionLabel: "Updating conversation...",
		});
	}

	if (text.includes("check conflicts") && !replies.some((reply) => reply.label === "Check conflicts")) {
		replies.push({
			label: "Check conflicts",
			payload: "Check conflicts on the current schedule.",
			actionLabel: "Checking conflicts...",
		});
	}

	if (text.includes("Which do you want?")) {
		replies.push({
			label: "Move scenes",
			payload: "I want to move scenes to another date.",
			actionLabel: "Preparing scene move options...",
		});
		replies.push({
			label: "Change availability",
			payload: "I want to change availability instead.",
			actionLabel: "Preparing availability update...",
		});
	}

	if (text.includes("Do you want me to **check conflicts**") || text.includes("Do you want me to check conflicts")) {
		replies.push({
			label: "Check conflicts",
			payload: "Check conflicts on this regenerated schedule.",
			actionLabel: "Checking conflicts...",
		});
		replies.push({
			label: "No, thanks",
			payload: "No, thanks.",
			actionLabel: "Updating conversation...",
		});
	}

	if (
		replies.length === 0 &&
		(normalizedText.includes("reply \"yes") ||
			normalizedText.includes("reply \"confirm\"") ||
			normalizedText.includes("reply “yes") ||
			normalizedText.includes("reply “confirm”") ||
			normalizedText.includes("before i run") ||
			normalizedText.includes("before i execute") ||
			normalizedText.includes("do you want me to") ||
			normalizedText.includes("would you like me to"))
	) {
		replies.push({
			label: "Yes",
			payload: "Yes.",
			actionLabel: "Processing confirmation...",
		});
		replies.push({
			label: "No",
			payload: "No.",
			actionLabel: "Updating conversation...",
		});
	}

	if (text.includes("confirm") && replies.length === 0) {
		replies.push({
			label: "Confirm",
			payload: "Confirm",
			actionLabel: "Processing confirmation...",
		});
		replies.push({
			label: "No",
			payload: "No.",
			actionLabel: "Updating conversation...",
		});
	}

	return replies.filter((reply, index, array) => array.findIndex((item) => item.label === reply.label) === index);
}

function inferPendingActionLabel(messageToSend, chatHistory = []) {
	const text = String(messageToSend || "").trim().toLowerCase();
	const lastAssistantMessage = [...chatHistory].reverse().find((message) => message.type === "assistant");
	const lastAssistantText = String(lastAssistantMessage?.content || "").toLowerCase();

	if (
		text.includes("regenerate") ||
		((text === "yes" || text === "yes.") &&
			(lastAssistantText.includes("before i regenerate") || lastAssistantText.includes("confirm these settings")))
	) {
		return "Regenerating schedule...";
	}

	if (text === "confirm") {
		if (lastAssistantText.includes("run the update") || lastAssistantText.includes("unavailable")) {
			return "Updating availability...";
		}
		return "Processing confirmation...";
	}

	if (text.includes("check conflicts") || (text === "yes" && lastAssistantText.includes("check conflicts"))) {
		return "Checking conflicts...";
	}

	if (text.includes("move scenes")) {
		return "Preparing scene move options...";
	}

	if (text.includes("change availability")) {
		return "Preparing availability update...";
	}

	if (text.includes("availability")) {
		return "Checking availability...";
	}

	return "Kino is working...";
}

function normalizeMessageForAssistantWorkflow(rawMessage, chatHistory = []) {
	const text = String(rawMessage || "").trim();
	const normalizedText = text.toLowerCase();
	const lastAssistantMessage = [...chatHistory].reverse().find((message) => message.type === "assistant");
	const lastAssistantText = String(lastAssistantMessage?.content || "").toLowerCase();

	if (!lastAssistantText) {
		return text;
	}

	const isSimpleYes = normalizedText === "yes" || normalizedText === "yes.";
	const isUpdateConfirmationPrompt =
		lastAssistantText.includes('reply "confirm"') ||
		lastAssistantText.includes("reply “confirm”") ||
		lastAssistantText.includes("please confirm you want me to apply this update") ||
		lastAssistantText.includes("before i run the update") ||
		lastAssistantText.includes("i'll execute the update");

	if (isSimpleYes && isUpdateConfirmationPrompt) {
		return "Confirm";
	}

	return text;
}

function findActionableAssistantMessage(chatHistory = []) {
	return [...chatHistory]
		.reverse()
		.find((message) => message.type === "assistant" && getQuickReplies(message).length > 0);
}

export default function Chatbot({ scheduleData, scheduleDays, scenes, conflicts = [], id, fetchScheduleData, refreshSupportingData }) {
	const [chatMessages, setChatMessages] = useState([]);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [chatInput, setChatInput] = useState("");
	const [pendingActionLabel, setPendingActionLabel] = useState("Kino is working...");
	const [usedQuickReplyMessageIds, setUsedQuickReplyMessageIds] = useState({});
	const normalizedConflicts = useMemo(() => (Array.isArray(conflicts) ? conflicts : []), [conflicts]);
	const nextMessageIdRef = useRef(0);

	const appendMessage = (message) => {
		const messageWithId = {
			...message,
			id: nextMessageIdRef.current,
		};
		nextMessageIdRef.current += 1;
		setChatMessages((prev) => [...prev, messageWithId]);
		return messageWithId;
	};

	const sendMessage = async (rawMessage, options = {}) => {
		const messageToSend = normalizeMessageForAssistantWorkflow(rawMessage, chatMessages);
		if (!messageToSend) return;

		try {
			setIsSendingMessage(true);
			setPendingActionLabel(options.actionLabel || inferPendingActionLabel(messageToSend, chatMessages));

			const actionableAssistantMessage = findActionableAssistantMessage(chatMessages);
			if (actionableAssistantMessage?.id !== undefined) {
				setUsedQuickReplyMessageIds((prev) => ({ ...prev, [actionableAssistantMessage.id]: true }));
			}

			appendMessage({
				type: "user",
				content: messageToSend,
			});

			setChatInput("");

			console.log("chatbot data : ", scheduleData, scheduleDays, scenes, normalizedConflicts);

			const response = await fetch(getApiUrl(`/api/${id}/query`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					question: messageToSend,
					schedule: scheduleData,
					scheduleDays: scheduleDays,
					breakdown: scenes,
					conflictsData: normalizedConflicts,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to process message");
			}

			const result = await response.json();

			console.log("bot ouput: ", result);

			appendMessage({
				type: "assistant",
				content: result.message,
				ui_action: result.ui_action,
			});
			await Promise.all([
				Promise.resolve(fetchScheduleData?.()),
				Promise.resolve(refreshSupportingData?.()),
			]);
		} catch (error) {
			console.error("Error sending message:", error);
			appendMessage({
				type: "error",
				content: `Error: ${error.message}`,
				timestamp: new Date().toISOString(),
			});
		} finally {
			setIsSendingMessage(false);
			setPendingActionLabel("Kino is working...");
		}
	};

	const handleSendMessage = async () => sendMessage(chatInput);

	const handleQuickReply = async (messageId, reply) => {
		if (isSendingMessage) return;
		setUsedQuickReplyMessageIds((prev) => ({ ...prev, [messageId]: true }));
		await sendMessage(reply.payload, { actionLabel: reply.actionLabel });
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
							key={message.id ?? index}
							className={`message-container ${message.type === "user" ? "user-message" : ""} ${
								message.type === "assistant" ? "assistant-message" : ""
							} ${message.type === "error" ? "error-message" : ""} ${
								message.type === "assistant" ? `assistant-message-${getAssistantMessageVariant(message.content)}` : ""
							}`}
						>
							<div className="message-content">
								{message.content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}
								{message.ui_action && message.ui_action.action === "RENDER_SCHEDULE_FORM" && !usedQuickReplyMessageIds[message.id] && (
									<ScheduleSettingsForm 
										defaultValues={message.ui_action.data} 
										onSubmit={(hiddenMsg) => {
											handleQuickReply(message.id, {
												payload: hiddenMsg,
												actionLabel: "Regenerating schedule..."
											});
										}} 
									/>
								)}
							</div>
							{message.type === "assistant" &&
								!usedQuickReplyMessageIds[message.id] &&
								getQuickReplies(message).length > 0 && (
								<div className="chat-quick-replies">
									{getQuickReplies(message).map((reply) => (
										<button
											key={`${message.id}-${reply.label}`}
											type="button"
											className="chat-quick-reply-button"
											onClick={() => handleQuickReply(message.id, reply)}
											disabled={isSendingMessage}
										>
											{reply.label}
										</button>
									))}
								</div>
							)}
						</div>
					))}
					{isSendingMessage && (
						<div className="message-container assistant-message loader-container">
							<div className="chat-loader-status">
								<div className="chat-loader-label">{pendingActionLabel}</div>
								<Loader />
							</div>
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
