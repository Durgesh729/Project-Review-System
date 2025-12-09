import React from 'react';
import './Loader.css';

const Loader = () => {
    return (
        <div className="loader-overlay">
            <div className="card">
                <div className="loader">
                    <p>loading</p>
                    <div className="words">
                        <span className="word">projects</span>
                        <span className="word">reviews</span>
                        <span className="word">code</span>
                        <span className="word">teams</span>
                        <span className="word">projects</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Loader;
