import React from 'react';

const ERROR_ENDPOINT = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api/error';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to backend
        try {
            fetch(ERROR_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: error.toString(),
                    stack: error.stack,
                    context: errorInfo
                })
            }).catch(e => console.error("Failed to log error to backend:", e));
        } catch (e) {
            console.error("ErrorBoundary fetch failed:", e);
        }

        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                    <div className="text-center max-w-lg">
                        <h1 className="text-3xl font-bold text-neon-pink mb-4">Something went wrong.</h1>
                        <p className="text-gray-400 mb-6">
                            We've logged this error and will look into it.
                            Please try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
