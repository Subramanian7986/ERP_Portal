import React from "react";
import "../../css/ErrorMessage.css";

const ErrorMessage = ({ message }) => (
  <div className="error-message">{message}</div>
);

export default ErrorMessage;
