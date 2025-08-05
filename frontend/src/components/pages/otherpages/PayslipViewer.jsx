import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../../css/PayslipViewer.css";

const PayslipViewer = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError("");

      // Get token from localStorage or sessionStorage
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      console.log(
        "🔍 Debug - Token check:",
        token ? "Token exists" : "No token found"
      );
      console.log("🔍 Debug - Token value:", token);
      console.log(
        "🔍 Debug - localStorage erp_token:",
        localStorage.getItem("erp_token")
      );
      console.log(
        "🔍 Debug - sessionStorage erp_token:",
        sessionStorage.getItem("erp_token")
      );

      if (!token) {
        setError("No authentication token found. Please log in.");
        setLoading(false);
        return;
      }

      const decoded = jwtDecode(token);
      const userId = decoded.id || decoded.userId;

      if (!userId) {
        setError("Invalid token. Please log in again.");
        setLoading(false);
        return;
      }

      console.log("🔍 Debug - User ID:", userId);

      // Fetch payslips for this user
      const response = await axios.get(
        `http://localhost:5000/api/payroll/payslips/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPayslips(response.data);
    } catch (error) {
      console.error("Error fetching payslips:", error);
      setError(
        error.response?.data?.error ||
          "Failed to fetch payslips. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayslipClick = (payslip) => {
    setSelectedPayslip(payslip);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayslip(null);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDownload = async (payslip, event) => {
    event.stopPropagation(); // Prevent modal from opening
    setDownloading(true);

    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");

      // Generate PDF payslip
      generatePayslipPDF(payslip);
    } catch (error) {
      console.error("Error downloading payslip:", error);
      alert("Failed to download payslip. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const generatePayslipPDF = (payslip) => {
    // Create new PDF document
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
      title: `Payslip - ${payslip.pay_period}`,
      subject: "Employee Payslip",
      author: "ERP System",
      creator: "ERP Portal",
    });

    // Add company logo/header
    doc.setFontSize(24);
    doc.setTextColor(102, 126, 234);
    doc.text("ERP PORTAL", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text("EMPLOYEE PAYSLIP", 105, 35, { align: "center" });

    // Add payslip period
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text(`Pay Period: ${payslip.pay_period}`, 105, 50, { align: "center" });

    // Employee Information Section
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.setFont(undefined, "bold");
    doc.text("Employee Information", 20, 70);

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${payslip.employee_name}`, 20, 80);
    doc.text(`Department: ${payslip.department}`, 20, 87);
    doc.text(`Position: ${payslip.position}`, 20, 94);
    doc.text(`Status: ${payslip.status}`, 20, 101);

    // Payment Details Section
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.setFont(undefined, "bold");
    doc.text("Payment Details", 20, 120);

    // Create payment details table using autoTable
    const paymentData = [
      ["Base Salary", formatCurrency(payslip.base_salary)],
      ["Allowances", formatCurrency(payslip.allowances)],
      ["Deductions", formatCurrency(payslip.deductions)],
      ["Gross Pay", formatCurrency(payslip.gross_pay)],
      ["Tax Amount", formatCurrency(payslip.tax_amount)],
      ["Net Pay", formatCurrency(payslip.net_pay)],
    ];

    autoTable(doc, {
      startY: 125,
      head: [["Description", "Amount"]],
      body: paymentData,
      theme: "grid",
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "right" },
      },
      didDrawCell: function (data) {
        // Highlight net pay row
        if (data.row.index === paymentData.length - 1) {
          doc.setFillColor(39, 174, 96);
          doc.setTextColor(255, 255, 255);
          doc.setFont(undefined, "bold");
        }
      },
    });

    // Working Days Information
    const workingData = [
      ["Working Days", payslip.working_days],
      ["Attendance Days", payslip.attendance_days],
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Working Information", "Days"]],
      body: workingData,
      theme: "grid",
      headStyles: {
        fillColor: [78, 205, 196],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center" },
      },
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      20,
      pageHeight - 20
    );
    doc.text("This is a computer generated document", 20, pageHeight - 15);
    doc.text("ERP Portal - Employee Self Service", 20, pageHeight - 10);

    // Add decorative elements
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    doc.line(20, 115, 190, 115);

    // Save the PDF
    const fileName = `payslip-${payslip.pay_period.replace("/", "-")}.pdf`;
    doc.save(fileName);
  };

  const handleBackClick = () => {
    // Navigate back to dashboard based on user role
    const token =
      localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded.role?.toLowerCase();

        // Navigate to appropriate dashboard based on role
        switch (role) {
          case "admin":
            navigate("/dashboard/admin");
            break;
          case "hr":
            navigate("/dashboard/hr");
            break;
          case "finance":
            navigate("/dashboard/finance");
            break;
          case "it":
            navigate("/dashboard/it");
            break;
          case "pm":
            navigate("/dashboard/pm");
            break;
          case "crm":
            navigate("/dashboard/crm");
            break;
          case "client":
            navigate("/dashboard/client");
            break;
          default:
            navigate("/dashboard/employee");
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        navigate("/employee-dashboard");
      }
    } else {
      navigate("/employee-dashboard");
    }
  };

  if (loading) {
    return (
      <div className="payslip-viewer">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading your payslips...</h2>
          <p>Please wait while we fetch your payment history.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payslip-viewer">
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchPayslips}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payslip-viewer">
      {/* Back Button */}
      <div className="back-button-container">
        <button className="back-btn" onClick={handleBackClick}>
          <span className="back-icon">←</span>
          Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="payslip-header">
        <h1>My Payslips</h1>
        <p>View your salary and payment history</p>
      </div>

      {/* Payslips Grid */}
      {payslips.length === 0 ? (
        <div className="no-payslips">
          <h3>No Payslips Found</h3>
          <p>
            You don't have any payslips yet. They will appear here once
            processed.
          </p>
        </div>
      ) : (
        <div className="payslips-grid">
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              className="payslip-card"
              onClick={() => handlePayslipClick(payslip)}
            >
              <div className="payslip-card-header">
                <h3>{payslip.pay_period}</h3>
                <span className="payslip-status">{payslip.status}</span>
              </div>
              <div className="payslip-card-body">
                <div className="payslip-amount">
                  <span className="amount-label">Net Pay</span>
                  <span className="amount-value">
                    {formatCurrency(payslip.net_pay)}
                  </span>
                </div>
                <div className="payslip-details">
                  <p>
                    <span>Gross:</span>
                    <span>{formatCurrency(payslip.gross_pay)}</span>
                  </p>
                  <p>
                    <span>Tax:</span>
                    <span>{formatCurrency(payslip.tax_amount)}</span>
                  </p>
                </div>
                <div className="payslip-actions">
                  <button
                    className="download-btn"
                    onClick={(e) => handleDownload(payslip, e)}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <span className="download-spinner">⏳</span>
                    ) : (
                      <span className="download-icon">📄</span>
                    )}
                    {downloading ? "Generating PDF..." : "Download PDF"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedPayslip && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payslip Details - {selectedPayslip.pay_period}</h2>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="payslip-detail-section">
                <h3>Employee Information</h3>
                <div className="detail-row">
                  <span>Name:</span>
                  <span>{selectedPayslip.employee_name}</span>
                </div>
                <div className="detail-row">
                  <span>Department:</span>
                  <span>{selectedPayslip.department}</span>
                </div>
                <div className="detail-row">
                  <span>Position:</span>
                  <span>{selectedPayslip.position}</span>
                </div>
                <div className="detail-row">
                  <span>Pay Period:</span>
                  <span>{selectedPayslip.pay_period}</span>
                </div>
              </div>

              <div className="payslip-detail-section">
                <h3>Payment Breakdown</h3>
                <div className="detail-row">
                  <span>Base Salary:</span>
                  <span>{formatCurrency(selectedPayslip.base_salary)}</span>
                </div>
                <div className="detail-row">
                  <span>Allowances:</span>
                  <span>{formatCurrency(selectedPayslip.allowances)}</span>
                </div>
                <div className="detail-row">
                  <span>Deductions:</span>
                  <span>{formatCurrency(selectedPayslip.deductions)}</span>
                </div>
                <div className="detail-row">
                  <span>Working Days:</span>
                  <span>{selectedPayslip.working_days}</span>
                </div>
                <div className="detail-row">
                  <span>Attendance Days:</span>
                  <span>{selectedPayslip.attendance_days}</span>
                </div>
                <div className="detail-row total">
                  <span>Net Pay:</span>
                  <span className="net-amount">
                    {formatCurrency(selectedPayslip.net_pay)}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-download-btn"
                  onClick={() =>
                    handleDownload(selectedPayslip, {
                      stopPropagation: () => {},
                    })
                  }
                  disabled={downloading}
                >
                  {downloading ? (
                    <span className="download-spinner">⏳</span>
                  ) : (
                    <span className="download-icon">📄</span>
                  )}
                  {downloading ? "Generating PDF..." : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipViewer;
