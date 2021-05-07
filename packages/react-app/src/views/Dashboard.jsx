/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState, useEffect, useCallback } from "react";
import "antd/dist/antd.css";
import { Button, Typography, Table, Input } from "antd";
import { useQuery, gql } from '@apollo/client';
import { Address } from "../components";
import Farm from "./Farm";
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';

export default function Dashboard(props) {
  // NOTE: This will depend on where you deploy.
  const [subgraphs, setSubgraphs] = useState([]);
  const [selectedSubgraphs, setSelectedSubgraphs] = useState([]);
  const [timeframe, setTimeframe] = useState("7d");
  const [network, setNetwork]     = useState("all");

  const SUBGRAPHS_QUERY = gql`
    query Recent
    {
      assets {
        id
        name
        totalSupply
      }
    }`;

  const { loading, error, data } = useQuery(SUBGRAPHS_QUERY);

  useEffect(()=>{
    if (data && data.assets) {
      setSubgraphs(data.assets)
      setSelectedSubgraphs(data.assets)
    }
  }, [loading, error, data])

  const handleSearch = useCallback((evt) => {
    const query = evt.target.value;

    if (!query) {
      setSelectedSubgraphs(subgraphs)
    } else {
      setSelectedSubgraphs(selectedSubgraphs.filter(asset => asset.name.toLowerCase().indexOf(query) >= 0));
    }
  }, [subgraphs])

  const updateNetwork = useCallback((network) => {
    setNetwork(network);
  }, [])

  const updateTimeframe = useCallback((timeframe) => {
    setTimeframe(timeframe);
  }, [])

  return (
    <div className="row mt-4">
      <div className="col-12">

        <div className="row">
          <div className="col-sm-7">
            <form className="d-flex">
              <input className="form-control me-2" type="search" placeholder="Filter by protocol, vault, gauge, etc." aria-label="Search" onChange={handleSearch} />
            </form>
          </div>
          <div className="col-sm-5 d-flex justify-content-end">
            <label htmlFor="networkChoice" class="col-form-label mr-10 col-2">Network</label>

            <div class="btn-group" role="group" id="networkChoice" aria-label="Basic radio toggle button group">
              <input type="radio" class="btn-check" name="network" id="network_all" autocomplete="off" checked={network === 'all'} onClick={() => { updateNetwork('all') } } />
              <label class="btn btn-outline-primary" htmlFor="network_all">All</label>

              <input type="radio" class="btn-check" name="network" id="network_ethereum" autocomplete="off" checked={network === 'ethereum'} onClick={() => { updateNetwork('ethereum') } } />
              <label class="btn btn-outline-primary" htmlFor="network_ethereum">Ethereum</label>

              <input type="radio" class="btn-check" name="network" id="network_polygon" autocomplete="off" checked={network === 'polygon'} onClick={() => { updateNetwork('polygon') } } />
              <label class="btn btn-outline-primary" htmlFor="network_polygon">Polygon</label>
            </div>
          </div>
        </div>

        <hr />

        <div className="row mt-2">
          <div className="col-sm-12 d-flex justify-content-end">
            <label htmlFor="timeframeChoice" class="col-form-label col-1">Timeframe</label>

            <div class="btn-group" role="group" id="timeframeChoice" aria-label="Basic radio toggle button group">
              <input type="radio" class="btn-check" name="timeframe" id="timeframe_7d" autocomplete="off" checked={timeframe === '7d'} onClick={() => { updateTimeframe('7d') } } />
              <label class="btn btn-outline-primary" htmlFor="timeframe_7d">Past 7 days</label>

              <input type="radio" class="btn-check" name="timeframe" id="timeframe_30d" autocomplete="off" checked={timeframe === '30d'} onClick={() => { updateTimeframe('30d') } } />
              <label class="btn btn-outline-primary" htmlFor="timeframe_30d">Past 30 days</label>

              <input type="radio" class="btn-check" name="timeframe" id="timeframe_90d" autocomplete="off" checked={timeframe === '90d'} onClick={() => { updateTimeframe('90d') } } />
              <label class="btn btn-outline-primary" htmlFor="timeframe_90d">Past 90 days</label>
            </div>
          </div>
        </div>

        <ul className="list-group mt-4">
          { selectedSubgraphs.map(function(subgraph) {
            return <Farm key={subgraph.id} subgraph={subgraph}/>
          })}
        </ul>
      </div>
    </div>
  );
}
