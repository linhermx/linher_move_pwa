import React from 'react';

const PageHeader = ({ title, subtitle, actions = null, leading = null, titleMeta = null }) => (
    <header className="page-header">
        <div className="page-header__main">
            {leading ? <div className="page-header__leading">{leading}</div> : null}
            <div className="page-header__content">
                <div className="page-header__title-row">
                    <h1 className="page-header__title">{title}</h1>
                    {titleMeta ? <div className="page-header__title-meta">{titleMeta}</div> : null}
                </div>
                {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
            </div>
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
);

export default PageHeader;
