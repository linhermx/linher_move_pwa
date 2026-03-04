import React, { useEffect, useRef, useState } from 'react';

const SCROLL_EPSILON = 2;

const getScrollState = (element) => {
    if (!element) {
        return {
            hasOverflow: false,
            showLeftFade: false,
            showRightFade: false
        };
    }

    const hasOverflow = element.scrollWidth > element.clientWidth + 1;
    const showLeftFade = hasOverflow && element.scrollLeft > SCROLL_EPSILON;
    const showRightFade = hasOverflow && element.scrollLeft + element.clientWidth < element.scrollWidth - SCROLL_EPSILON;

    return {
        hasOverflow,
        showLeftFade,
        showRightFade
    };
};

const TableScrollFade = ({ children }) => {
    const scrollRef = useRef(null);
    const frameRef = useRef(null);
    const [scrollState, setScrollState] = useState({
        hasOverflow: false,
        showLeftFade: false,
        showRightFade: false
    });

    useEffect(() => {
        const element = scrollRef.current;

        if (!element) {
            return undefined;
        }

        const updateScrollState = () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }

            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;

                setScrollState((currentState) => {
                    const nextState = getScrollState(element);

                    if (
                        currentState.hasOverflow === nextState.hasOverflow
                        && currentState.showLeftFade === nextState.showLeftFade
                        && currentState.showRightFade === nextState.showRightFade
                    ) {
                        return currentState;
                    }

                    return nextState;
                });
            });
        };

        updateScrollState();

        element.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        let resizeObserver;

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                updateScrollState();
            });

            resizeObserver.observe(element);

            if (element.firstElementChild) {
                resizeObserver.observe(element.firstElementChild);
            }
        }

        return () => {
            element.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);

            if (resizeObserver) {
                resizeObserver.disconnect();
            }

            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    const shellClassName = [
        'table-scroll-shell',
        scrollState.hasOverflow ? 'table-scroll-shell--overflow' : '',
        scrollState.showLeftFade ? 'table-scroll-shell--show-left' : '',
        scrollState.showRightFade ? 'table-scroll-shell--show-right' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={shellClassName}>
            <div className="table-scroll" ref={scrollRef}>
                {children}
            </div>
            <span className="table-scroll-shell__fade table-scroll-shell__fade--left" aria-hidden="true" />
            <span className="table-scroll-shell__fade table-scroll-shell__fade--right" aria-hidden="true" />
        </div>
    );
};

export default TableScrollFade;
