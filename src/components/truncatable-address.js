import React, { Component } from 'react'

/*
 * ETH addresses should not be truncated in cases
 * where a transaction is about to be consummated
 * or where the current user is being identified.
 * This component should only be used in cases where
 * there is more than one address shown in close
 * proximity to another.
*/

class TruncatableAddress extends Component {
  render() {
    const { address, className } = this.props

    return (
      <div className={`address d-flex justify-content-around${className ? ` ${className}` : ''}`}>
        <div>{address.slice(0, address.length / 2)}</div>
        <div>{address.slice(address.length / 2)}</div>
      </div>
    )
  }
}

export default TruncatableAddress
