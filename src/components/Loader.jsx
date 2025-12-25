import React from "react";

const Loader = () => {
	return (
		<>
			<style>{`
        .dots-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
         
        }

        .dot {
          height: 8px;
          width: 8px;
          margin-right: 6px;
          border-radius: 50%;
          background-color: #ff6758;
          animation: pulse 1.2s infinite ease-in-out;
          opacity: 0.6;
        }

        .dot:last-child {
          margin-right: 0;
        }

        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        .dot:nth-child(3) {
          animation-delay: 0s;
        }

        @keyframes pulse {
          0%, 80%, 100% { 
            transform: scale(0.6);
            opacity: 0.4;
          } 
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

			<div className="dots-container">
				<div className="dot" />
				<div className="dot" />
				<div className="dot" />
			</div>
		</>
	);
};

export default Loader;
