

/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect } from "react";
import "antd/dist/antd.css";
import { Button, Typography, Table, Input } from "antd";
import { useQuery, gql } from '@apollo/client';
import { Address } from "../components";
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';
import { convertToPrice, chartOptions } from '../helpers';

import { defaults, Line } from 'react-chartjs-2';

export default function Farm({ subgraph }) {
  const [timeseries, setTimeseries] = useState([]);
  const [chartData, setChartData]   = useState({});


  const GET_PRICE_HISTORIES = gql`
  query Recent
  {
    priceHistoryDailies(first: 100, orderBy: timestamp, orderDirection: desc, where: {asset: "${subgraph.id}"}) {
      id
      pricePerShare
      timestamp
    }
  }`;

  const { loading, error, data } = useQuery(GET_PRICE_HISTORIES);

  useEffect(()=>{
    console.log("loading = ", loading);
    console.log("error = ", error);
    console.log("data = ", data);

    if (data && data.priceHistoryDailies) {
      const history = data.priceHistoryDailies;
      const labels  = history.map( (h) => {
        return parseInt(h.timestamp);
        // const d = new Date();
        // return d.setUTCSeconds(h.timestamp);
      });

      const prices = history.map( (h) => {
        return convertToPrice(h.pricePerShare);
      });

      console.log("labels = ", labels);
      console.log("prices = ", prices);
      // setTimeseries(labels);

      setChartData({
        labels: labels,
        datasets: [{
          label: 'Price History',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: prices,
        }]
      });

    }

  }, [loading, error, data])


  return (
    <li class="list-group-item">
      <div class="row">
        <div class="col-3">
          {subgraph.name}
        </div>
        <div class="col-9">
          <Line data={chartData} options={chartOptions()} />
        </div>
      </div>
    </li>
  );
}
