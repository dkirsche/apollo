/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState, useEffect, useCallback } from "react";
// import "antd/dist/antd.css";
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';
import Farm from "./Farm";
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
// import fetch from 'isomorphic-fetch';
import axios from 'axios';
import orderBy from 'lodash/orderBy';

import { calculateRewardOtherAPR,
  calculateBaseAPR, calculateCrvAPR, convertToPrice, chartOptions, commarize, stDev, calculateRiskScore,
  calculateTVL, calculateAPR, timestampForTimeframe, calculateAverageAPR } from '../helpers';

const maticClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/dkirsche/pricehistorytest",
  cache: new InMemoryCache()
});

export default function Dashboard(props) {
  // NOTE: This will depend on where you deploy.
  const [subgraphs, setSubgraphs] = useState([]);
  const [selectedSubgraphs, setSelectedSubgraphs] = useState([]);
  const [timeframe, setTimeframe] = useState("30d");
  const [network, setNetwork]     = useState("all");
  const [crvPrices, setCrvPrices] = useState([])
  const [maticPrices, setMaticPrices] = useState([])
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState('apr');
  const [sortDirection, setSortDirection] = useState('desc');

  const SUBGRAPHS_QUERY_MAINNET = gql`
    query Recent
    {
      assets {
        id
        name
        totalSupply
        priceHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
          id
          pricePerShare
          timestamp
        }
        rewardHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
          asset {
            id
          }
          gaugeId
          rewardPerShareBoosted
          rewardPerShareNotBoosted
          workingSupply
          reward
          rewardToken
          rewardTokenID
          timestamp
        }

      }
    }`;

  const SUBGRAPHS_QUERY_MATIC = gql`
    query Recent
    {
      assets {
        id
        name
        totalSupply
        priceHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
          id
          pricePerShare
          timestamp
        }
        rewardHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
          asset {
            id
          }
          gaugeId
          rewardPerShareBoosted
          rewardPerShareNotBoosted
          workingSupply
          reward
          rewardToken
          rewardTokenID
          timestamp
        }
      }
    }`;

  const mainSubgraph  = useQuery(SUBGRAPHS_QUERY_MAINNET);
  const maticSubgraph = useQuery(SUBGRAPHS_QUERY_MATIC, { client: maticClient });

  // Fetch Coingecko API
  async function loadPrices() {
    try {
      let crvPrices   = await axios("https://api.coingecko.com/api/v3/coins/curve-dao-token/market_chart?vs_currency=usd&days=90&interval=daily");
      setCrvPrices(crvPrices.data.prices);
      let maticPrices = await axios("https://api.coingecko.com/api/v3/coins/matic-network/market_chart?vs_currency=usd&days=90&interval=daily")
      setMaticPrices(maticPrices.data.prices);
    } catch {
      alert("Something went wrong loading the prices. Please reload!");
    }
  }

  async function loadData() {
    if (mainSubgraph.data && mainSubgraph.data.assets && maticSubgraph.data && maticSubgraph.data.assets) {
      const mainnetAssets = mainSubgraph.data.assets.map(ass => {
        return {...ass, network: 'ethereum'}
      }).filter(ass => {
        return ass.name !== 'yearn Curve.fi yDAI/yUSDC/yUSDT/yTUSD' && ass.name !== 'curve_ren'
      })
      const polygonAssets = maticSubgraph.data.assets.map(ass => {
        return {...ass, network: 'polygon'}
      })

      const assets = [...mainnetAssets, ...polygonAssets];


      // Now, let's calculate APR and associate with subgraph.
      // NOTE: This won't sort properly for Matic rewards. There's a separate query in <FARM> that needes
      // to be pulled in here.
      let aprs;
      const formattedAssets = assets.map(subgraph => {
        const startTimestamp = timestampForTimeframe({ timeframe })
        const priceHistory   = subgraph.priceHistoryDaily.filter(price =>  price.timestamp * 1000 >= startTimestamp);
        const rewardHistory  = subgraph.rewardHistoryDaily.filter(price => price.timestamp * 1000 >= startTimestamp);
        aprs = calculateAPR({ crvPrices, maticPrices, priceHistory, rewardHistory, rewardOther: [] })
        aprs = aprs.reverse();
        aprs.shift();

        if(aprs[0]) {
          const averageAPRs = calculateAverageAPR({aprs, timeframe});
          subgraph.apr      = {base: averageAPRs.base, reward: averageAPRs.reward, total: averageAPRs.total}
        }

        return subgraph
      });


      setSubgraphs(formattedAssets)
      setSelectedSubgraphs(formattedAssets)




      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrices();
    loadData();

  }, [mainSubgraph.data, maticSubgraph.data])

  const sortedTableData = useCallback(() => {
    if (!selectedSubgraphs) {
      return [];
    }
    if (sortBy === 'apr') {
      return orderBy(selectedSubgraphs, row => row.apr.total, [sortDirection]);
    }

    if (sortBy === 'name') {
      return orderBy(selectedSubgraphs, row => row.name, [sortDirection]);
    }

    return orderBy(selectedSubgraphs, [sortBy], [sortDirection]);

  }, [sortBy, sortDirection, selectedSubgraphs])


  const setSort = value => {
    let direction = 'desc';
    if (value === sortBy && sortDirection === 'asc') {
      direction = 'desc';
    }
    if (value === sortBy && sortDirection === 'desc') {
      direction = 'asc';
    }

    setSortBy(value);
    setSortDirection(direction);
  };

  const sortIcon = value => {
    if (sortBy === value && sortDirection === 'asc') {
      return <i className="fas fa-sort-up ml-2" />;
    }
    if (sortBy === value && sortDirection === 'desc') {
      return <i className="fas fa-sort-down ml-2" />;
    }

    return <i className="fas fa-sort ml-2" style={{ color: '#ddd' }} />;
  };

  const handleSearch = useCallback((evt) => {
    const query = evt.target.value.toLowerCase();

    if (!query) {
      setSelectedSubgraphs(subgraphs)
    } else {
      setSelectedSubgraphs(subgraphs.filter(asset => asset.name.toLowerCase().indexOf(query) >= 0));
    }
  }, [subgraphs])

  const updateNetwork = useCallback((network) => {
    if (network === 'all') {
      setSelectedSubgraphs(subgraphs)
    } else {
      setSelectedSubgraphs(subgraphs.filter(asset => asset.network === network));
    }

    setNetwork(network);
  }, [subgraphs])

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
            <label htmlFor="networkChoice" className="col-form-label mr-10 col-2">Network</label>

            <div className="btn-group" role="group" id="networkChoice" aria-label="Basic radio toggle button group">
              <input type="radio" className="btn-check" name="network" id="network_all" autoComplete="off" checked={network === 'all'} onClick={() => { updateNetwork('all') } } />
              <label className="btn btn-outline-primary" htmlFor="network_all">All</label>

              <input type="radio" className="btn-check" name="network" id="network_ethereum" autoComplete="off" checked={network === 'ethereum'} onClick={() => { updateNetwork('ethereum') } } />
              <label className="btn btn-outline-primary" htmlFor="network_ethereum">Ethereum</label>

              <input type="radio" className="btn-check" name="network" id="network_polygon" autoComplete="off" checked={network === 'polygon'} onClick={() => { updateNetwork('polygon') } } />
              <label className="btn btn-outline-primary" htmlFor="network_polygon">Polygon</label>
            </div>
          </div>
        </div>

        <hr />

        <div className="row mt-2">
          <div className="col-sm-12 d-flex justify-content-end">
            <label htmlFor="timeframeChoice" className="col-form-label col-1">Timeframe</label>

            <div className="btn-group" role="group" id="timeframeChoice" aria-label="Basic radio toggle button group">
              <input type="radio" className="btn-check" name="timeframe" id="timeframe_7d" autoComplete="off" checked={timeframe === '7d'} onClick={() => { updateTimeframe('7d') } } />
              <label className="btn btn-outline-primary" htmlFor="timeframe_7d">Past 7 days</label>

              <input type="radio" className="btn-check" name="timeframe" id="timeframe_30d" autoComplete="off" checked={timeframe === '30d'} onClick={() => { updateTimeframe('30d') } } />
              <label className="btn btn-outline-primary" htmlFor="timeframe_30d">Past 30 days</label>

              <input type="radio" className="btn-check" name="timeframe" id="timeframe_90d" autoComplete="off" checked={timeframe === '90d'} onClick={() => { updateTimeframe('90d') } } />
              <label className="btn btn-outline-primary" htmlFor="timeframe_90d">Past 90 days</label>
            </div>
          </div>
        </div>

        {loading && <div className="row mt-2">
          <div className="col-12 text-center">
            <i className="fa fa-sync fa-spin" style={{fontSize: "32px"}} />
            <h1>Loading subgraphs</h1>
          </div>
        </div>}

        {!loading && <table className="table">
          <thead>
            <tr>
              <th scope="col" onClick={() => setSort('name')}>
                Pool
                {sortIcon('name')}
              </th>
              <th scope="col">
                TVL
              </th>

              <th scope="col">
                Historical APR
              </th>

              <th scope="col" onClick={() => setSort('apr')}>
                Average APR
                {sortIcon('apr')}
              </th>

              <th scope="col">
                Risk Score
              </th>

            </tr>
          </thead>
          <tbody>
            { sortedTableData().map(function(subgraph) {
              return <Farm key={subgraph.id + '_' + subgraph.network} subgraph={subgraph} priceHistoryAll={subgraph.priceHistoryDaily} rewardHistoryAll={subgraph.rewardHistoryDaily}  crvPrices={crvPrices} maticPrices={maticPrices} timeframe={timeframe}/>
            })}
          </tbody>
        </table>}




        {false && !loading && <ul className="list-group mt-4">
          <li className="list-group-item">
            <div className="row">
              <div className="col-2 align-items-center d-flex flex-column align-self-center">
                <div className="d-flex mb-2 justify-content-center">
                  <h4 className="mb-0">Pool</h4>
                </div>
              </div>

              <div className="col-1 align-items-center d-flex flex-column align-self-center">
                <h4 className="mb-0">TVL</h4>
              </div>

              <div className="col-4 align-items-center d-flex flex-column align-self-center">
                <h4 className="mb-0">Historical APR</h4>
              </div>

              <div className="col-2 align-items-center d-flex flex-column align-self-center">
                <h4 className="mb-0">Average APR</h4>
              </div>
              <div className="col-2 align-items-center d-flex flex-column align-self-center">
                <h4 className="mb-0">Risk Score</h4>
              </div>
            </div>
          </li>

          { sortedTableData().map(function(subgraph) {
            return <Farm key={subgraph.id + '_' + subgraph.network} subgraph={subgraph} priceHistoryAll={subgraph.priceHistoryDaily} rewardHistoryAll={subgraph.rewardHistoryDaily}  crvPrices={crvPrices} maticPrices={maticPrices} timeframe={timeframe}/>
          })}
        </ul>}


      </div>
    </div>
  );
}
