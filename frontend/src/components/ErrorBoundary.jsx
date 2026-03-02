import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { reportClientError } from '../services/clientLogger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        reportClientError({
            action: 'REACT_ERROR_BOUNDARY',
            message: error.message,
            stack: error.stack,
            component_stack: errorInfo.componentStack,
            details: {
                boundary: this.props.name || 'AppBoundary'
            }
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="auth-layout">
                    <div className="card auth-shell stack-md">
                        <div className="cluster-sm text-primary">
                            <AlertTriangle size={22} />
                            <strong>Error inesperado</strong>
                        </div>
                        <p className="text-muted">
                            Ocurrió un fallo al renderizar esta vista. Recarga la aplicación o intenta nuevamente.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
