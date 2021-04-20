/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState } from "react";
import "antd/dist/antd.css";
import { Button, Typography, Table, Input } from "antd";
import { useQuery, gql } from '@apollo/client';
import { Address } from "../components";
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';

  const highlight = { marginLeft: 4, marginRight: 8, /*backgroundColor: "#f9f9f9",*/ padding: 4, borderRadius: 4, fontWeight: "bolder" }

export default function DataFeed(props) {
  // NOTE: This will depend on where you deploy.
  const [subgraph, setSubgraph] = useState("https://api.thegraph.com/subgraphs/name/dkirsche/asset-price-history");

  function graphQLFetcher(graphQLParams) {
    return fetch(subgraph, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphQLParams),
    }).then(response => response.json());
  }

  const EXAMPLE_GRAPHQL = `
  {
    assets(first: 10) {
      id
      name
      totalSupply
      priceHistoryDaily(first: 10) {
        id
        pricePerShare
        timestamp
        txnHash
      }
    }
  }
  `
  return (
    <>
      <div style={{width:1200, margin: "auto", paddingBottom:64}}>

        <div style={{margin:32, textAlign:'right'}}>
          <Input onChange={(e)=>{setSubgraph(e.target.value)}} value={subgraph} placeholder="Enter URL of subgraph here" />
        </div>

        <p>
          You can use this to directly query PriceFeed subgraphs. Simply enter the subgraph URL below and it'll update
          on change. Right now, you're querying: {subgraph}
        </p>

        <p>
          If you have your own subgraph setup, you can use http://localhost:8000/subgraphs/name/dkirsche/asset-price-history
          If you need help setting up a Subgraph, read the instructions here: https://github.com/dkirsche/token-history-subgraph/blob/main/README.md
        </p>

        <div style={{margin:32, height:400, border:"1px solid #888888", textAlign:'left'}}>
          <GraphiQL fetcher={graphQLFetcher} docExplorerOpen={true} query={EXAMPLE_GRAPHQL}/>
        </div>

      </div>

      <div style={{padding:64}}>
      ...
      </div>
    </>
  );
}
