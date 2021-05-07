/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState, useEffect } from "react";
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
    }
  }, [loading, error, data])


  return (
    <div className="row mt-4">
      <div className="col-12">

        <form className="d-flex">
          <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
        </form>


        <ul className="list-group mt-4">
          { subgraphs.map(function(subgraph) {
            return <Farm key={subgraph.id} subgraph={subgraph}/>
          })}
        </ul>



      </div>
    </div>
  );
}
