import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";

import { DataFeed, Dashboard } from "./views"

function App(props) {
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">WiseFarmer</a>
        </div>
      </nav>

      <div className="container">
        <div className="row">
          <BrowserRouter>
            <Switch>
              <Route path="/">
                <Dashboard />
              </Route>

              <Route path="/datafeed">
                <DataFeed />
              </Route>


            </Switch>
          </BrowserRouter>
        </div>
      </div>
    </div>
  );
}

export default App;
