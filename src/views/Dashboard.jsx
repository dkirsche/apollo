/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState, useEffect, useCallback } from "react";
// import "antd/dist/antd.css";
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';
import Farm from "./Farm";
import { LoadClients, IsLoaded, MergeData } from '../helpers/subgraphs';
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
// import fetch from 'isomorphic-fetch';
import axios from 'axios';
import orderBy from 'lodash/orderBy';

import { calculateRewardOtherAPR,
  calculateBaseAPR, calculateCrvAPR, convertToPrice, chartOptions, commarize, stDev, calculateRiskScore,
  calculateTVL, calculateAPR, timestampForTimeframe, calculateAverageAPR, getProtocol, isStablecoin } from '../helpers';

const maticClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/dkirsche/pricehistorytest",
  cache: new InMemoryCache()
});

let clients = LoadClients()

export default function Dashboard(props) {
  // NOTE: This will depend on where you deploy.
  const [subgraphs, setSubgraphs] = useState([]);
  const [assetType, setAssetType] = useState("stable");
  const [selectedSubgraphs, setSelectedSubgraphs] = useState([]);
  const [timeframe, setTimeframe] = useState("30d");
  const [protocol, setProtocol] = useState("curve"); // Default to AAVE
  const [network, setNetwork]     = useState("ethereum");
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
        rewardOther(first: 100, orderBy: timestamp, orderDirection: desc){
          asset {
              id
            }
          gaugeId
          rewardIntegral
          timestamp
        }
      }
    }`;


  //this should be turned into its own effect eventually to seemlessly manage all subgraphs
  let subgraph
  //subgraph = clients.get("XXX") XXX is the top level key for each subgraph in subgraph.json
  subgraph = clients.get("yearn") //this is needed for each subgraph defined in subgraph.json.
  let yearnSubgraph = useQuery(SUBGRAPHS_QUERY_MAINNET,{client: subgraph.client}); //need to store in separate variable for useEffect
  subgraph.subgraphQuery  = yearnSubgraph

  subgraph = clients.get("curve") //this is needed for each subgraph defined in subgraph.json.
  let curveSubgraph = useQuery(SUBGRAPHS_QUERY_MAINNET,{client: subgraph.client}); //need to store in separate variable for useEffect
  subgraph.subgraphQuery  = curveSubgraph

  subgraph = clients.get("aave") //this is needed for each subgraph defined in subgraph.json.
  let aaveSubgraph = useQuery(SUBGRAPHS_QUERY_MAINNET,{client: subgraph.client}); //need to store in separate variable for useEffect
  subgraph.subgraphQuery  = aaveSubgraph

  subgraph = clients.get("curveMatic")
  let curveMaticSubgraph = useQuery(SUBGRAPHS_QUERY_MATIC,{client: subgraph.client}); //need to store in separate variable for useEffect
  subgraph.subgraphQuery  = curveMaticSubgraph

  subgraph = clients.get("aaveMatic")
  let aaveMaticSubgraph = useQuery(SUBGRAPHS_QUERY_MATIC,{client: subgraph.client}); //need to store in separate variable for useEffect
  subgraph.subgraphQuery  = aaveMaticSubgraph


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
    if (!IsLoaded) return false

    //const assets = [...mainnetAssets, ...polygonAssets];
    const assets = MergeData(clients)

    // Now, let's calculate APR and associate with subgraph.
    // NOTE: This won't sort properly for Matic rewards. There's a separate query in <FARM> that needes
    // to be pulled in here.
    let aprs;
    const allAssets = assets.map(subgraph => {
      const startTimestamp = timestampForTimeframe({ timeframe })
      const priceHistory   = subgraph.priceHistoryDaily.filter(price =>  price.timestamp * 1000 >= startTimestamp);
      const rewardHistory  = subgraph.rewardHistoryDaily.filter(price => price.timestamp * 1000 >= startTimestamp);

      let rewardOther;
      if (subgraph.rewardOther)
        rewardOther = subgraph.rewardOther.filter(price => price.timestamp * 1000 >= startTimestamp);
      else
        rewardOther = [];

      aprs = calculateAPR({ crvPrices, maticPrices, priceHistory, rewardHistory, rewardOther })
      aprs = aprs.reverse();
      aprs.shift();

      if(aprs[0]) {
        const averageAPRs = calculateAverageAPR({aprs, timeframe});
        subgraph.apr      = {base: averageAPRs.base, reward: averageAPRs.reward, total: averageAPRs.total}
      }

      let latestPriceData;
      if (subgraph.network === 'ethereum') {
        let priceHistData   = Object.assign([], subgraph.priceHistoryDaily);
        latestPriceData = priceHistData.reverse();
      } else {
        let priceHistData   = Object.assign([], subgraph.priceHistoryDaily);
        latestPriceData = priceHistData.reverse();
      }

      subgraph.protocol = getProtocol({subgraph});
      const prettyTVL = calculateTVL({ priceHistory: latestPriceData, totalSupply: subgraph.totalSupply })
      subgraph.tvl = prettyTVL

      subgraph.assetType = isStablecoin({ subgraph }) ? 'stable' : 'volatile';

      return subgraph
    });

    setSubgraphs(allAssets)

    const formattedAssets = allAssets.filter(asset => asset.protocol === protocol && asset.network === network)
    setSelectedSubgraphs(formattedAssets)

    setLoading(false);
  }

  useEffect(() => {
    loadPrices();
    loadData();

  }, [yearnSubgraph, curveSubgraph, aaveSubgraph, curveMaticSubgraph, aaveMaticSubgraph])

  const sortedTableData = useCallback(() => {
    if (!selectedSubgraphs) {
      return [];
    }
    if (sortBy === 'apr') {
      return orderBy(selectedSubgraphs, row => Number(row.apr.total), [sortDirection]);
    }

    if (sortBy === 'name') {
      return orderBy(selectedSubgraphs, row => row.name, [sortDirection]);
    }

    if (sortBy === 'tvl') {
      return orderBy(selectedSubgraphs, row => row.tvl, [sortDirection]);
    }

    return orderBy(selectedSubgraphs, [sortBy], [sortDirection]);

  }, [sortBy, sortDirection, selectedSubgraphs, timeframe])


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
      return <i className="fas fa-sort-up ms-2" />;
    }
    if (sortBy === value && sortDirection === 'desc') {
      return <i className="fas fa-sort-down ms-2" />;
    }

    return <i className="fas fa-sort ms-2" style={{ color: '#ddd' }} />;
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

  const updateProtocol = useCallback((protocol) => {
    if (protocol === 'all') {
      setSelectedSubgraphs(subgraphs)
    } else {
      setSelectedSubgraphs(subgraphs.filter(asset => asset.protocol === protocol));
    }

    setProtocol(protocol);
  }, [subgraphs])


  const updateAssetType = useCallback((assetType) => {
    setSelectedSubgraphs(subgraphs.filter(asset => asset.assetType === assetType));
    setAssetType(assetType);
  }, [subgraphs])

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
          <div className="col-sm-4 d-flex">
            <div className="btn-group" role="group" id="protocol">
              <input type="radio" className="btn-check" name="protocol" id="protocol_all" autoComplete="off" checked={protocol === 'all'} onClick={() => { updateProtocol('all') } } />
              <label className="btn btn-outline-primary" htmlFor="protocol_all">All</label>

              <input type="radio" className="btn-check" name="protocol" id="protocol_aave" autoComplete="off" checked={protocol === 'aave'} onClick={() => { updateProtocol('aave') } } />
              <label className="btn btn-outline-primary" htmlFor="protocol_aave">AAVE</label>

              <input type="radio" className="btn-check" name="protocol" id="protocol_curve" autoComplete="off" checked={protocol === 'curve'} onClick={() => { updateProtocol('curve') }} />
              <label className="btn btn-outline-primary" htmlFor="protocol_curve">Curve</label>

              <input type="radio" className="btn-check" name="protocol" id="protocol_yearn" autoComplete="off" checked={protocol === 'yearn'} onClick={() => { updateProtocol('yearn') }} />
              <label className="btn btn-outline-primary" htmlFor="protocol_yearn">Yearn</label>
            </div>
          </div>

          <div className="col-sm-4 d-flex">
            <div className="btn-group" role="group" id="assetType">
              <input type="radio" className="btn-check" name="assetType" id="assetType_curve" autoComplete="off" checked={assetType === 'stable'} onClick={() => { updateAssetType('stable') }} />
              <label className="btn btn-outline-primary" htmlFor="assetType_stablecoins">Stablecoins</label>

              <input type="radio" className="btn-check" name="assetType" id="assetType_yearn" autoComplete="off" checked={assetType === 'volatile'} onClick={() => { updateAssetType('volatile') }} />
              <label className="btn btn-outline-primary" htmlFor="assetType_volatile">Volatile</label>
            </div>
          </div>

          <div className="col-sm-4 d-flex justify-content-end">
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
              <th className="text-center" scope="col" onClick={() => setSort('name')}>
                Vault
                {sortIcon('name')}
              </th>
              <th className="text-center" scope="col" onClick={() => setSort('tvl')}>
                TVL
                {sortIcon('tvl')}
              </th>

              <th className="text-center" scope="col">
                Historical APR
              </th>

              <th className="text-center" scope="col" onClick={() => setSort('apr')}>
                Average APR
                {sortIcon('apr')}
              </th>

              <th className="text-center" scope="col">
                Risk Score
              </th>

            </tr>
          </thead>
          <tbody>
            { sortedTableData().map(function(subgraph) {
              return <Farm key={subgraph.id + '_' + subgraph.network} subgraph={subgraph} priceHistoryAll={subgraph.priceHistoryDaily} rewardHistoryAll={subgraph.rewardHistoryDaily}  crvPrices={crvPrices} maticPrices={maticPrices} timeframe={timeframe} protocol={protocol}/>
            })}
          </tbody>
        </table>}


      </div>
    </div>
  );
}
