import React from "react";

/**
 * ErrorBoundary — catches render errors in any child subtree
 * and shows a friendly fallback UI instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something broke</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console — swap for a real error-reporting service if needed
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // If caller provided a custom fallback, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          padding: "40px 24px",
          textAlign: "center",
          fontFamily: "'Manrope', sans-serif",
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(205,167,81,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            fontSize: "24px",
          }}>
            ⚠️
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#1a202c" }}>
            Something went wrong
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", maxWidth: "320px" }}>
            {this.state.error?.message || "An unexpected error occurred. Please try refreshing the page."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 20px",
              background: "#CDA751",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontFamily: "'Manrope', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
