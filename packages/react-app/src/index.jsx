import React from "react";
import ReactDOM from "react-dom";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import "./index.css";
import App from "./App";

const client = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/dkirsche/asset-price-history",
  cache: new InMemoryCache()
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root"),
);
