# platform-nft-factory

AWS CDK + Razzle app for the NFT factory. Archived snapshot, as-is.

This tree is a **new public commit** with no git history. The original private archive is `eulertools/platform-nft-factory-archive`.

Hosted-zone choice uses `CDK_DEV_ACCOUNT`. Generated `cdk.context.json` was **removed**. Cognito user-pool id is `COGNITO_USER_POOL_ID`.

## Recorded contract (from `.env.example`)

| Network | Address |
|---|---|
| BSC | `0xb4d03843ea821cb1892c5163c37f196073df5288` |

## What was built (EN)

platform-nft-factory is an AWS CDK project that provisions the NFT factory service infrastructure on AWS. It defines a `PlatformNftFactoryStack` that orchestrates certificate provisioning, CDN setup, OpenSearch-backed storage, and API pipelines. The stack creates a CertificateConstruct, CdnConstruct, StorageConstruct, and ApiPipelineConstruct, with Cognito user pool integration for API authorization. The source directory contains an OpenSearch sync Lambda, NFT/collection/product API handlers, and supporting code.

## Qué se construyó (ES)

platform-nft-factory es un proyecto AWS CDK que provisiona la infraestructura del servicio de fábrica NFT. Contexto CDK de AWS eliminado.

---

## Notice / Aviso

**Euler Tools ha cerrado. Euler Tools is closed.**

La empresa quebró. Este repositorio está archivado y no se mantiene. El software se ofrece tal cual (as is), sin garantía ni soporte. Parte del material puede ser reclamado por acreedores.

The company went bankrupt. This repository is archived and unmaintained. Software is provided as is, with no warranty and no support. Some material may be claimed by creditors.

Site: https://euler.tools  
Org: https://github.com/eulertools  
Enquiries: https://sinequix.com · https://github.com/tebayoso
