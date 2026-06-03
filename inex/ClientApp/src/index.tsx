import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import "./dayjsSetup"; // must be first — registers dayjs plugins before any component loads
import App from './App';
import store from "./store";
import "./i18n";
import "./styles/tokens.css";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <Provider store={store}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Provider>
    );
}
