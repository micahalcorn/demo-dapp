import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { FormattedMessage } from 'react-intl'

import ListingCardPrices from 'components/listing-card-prices'

import { translateListingCategory } from 'utils/translationUtils'

import origin from '../services/origin'

class ListingCard extends Component {

  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      shouldRender: true
    }
  }

  async componentDidMount() {
    try {
      const listing = await origin.listings.getByIndex(this.props.listingId)
      const translatedListing = translateListingCategory(listing)
      if (!this.props.hideList.includes(translatedListing.address)) {
        const obj = Object.assign({}, translatedListing, { loading: false })

        this.setState(obj)
      } else {
        this.setState({ shouldRender: false })
      }
    } catch (error) {
      console.error(`Error fetching contract or IPFS info for listingId: ${this.props.listingId}`)
    }
  }

  render() {
    const { address, category, loading, name, pictures, price, unitsAvailable, shouldRender } = this.state
    const photo = pictures && pictures.length && (new URL(pictures[0])).protocol === "data:" && pictures[0]

    if (!shouldRender) return false

    return (
      <div className={`col-12 col-md-6 col-lg-4 listing-card${loading ? ' loading' : ''}`}>
        <Link to={`/listing/${address}`}>
          {!!photo &&
            <div className="photo" style={{ backgroundImage: `url("${photo}")` }}></div>
          }
          {!photo &&
            <div className="image-container d-flex justify-content-center">
              <img src="images/default-image.svg" alt="camera icon" />
            </div>
          }
          <div className="category placehold d-flex justify-content-between">
            <div>{category}</div>
            {!loading &&
              <div>
                {this.props.listingId < 5 &&
                  <span className="featured badge">
                    <FormattedMessage
                      id={ 'listing-card.featured' }
                      defaultMessage={ 'Featured' }
                    />
                  </span>
                }
              </div>
            }
          </div>
          <h2 className="title placehold text-truncate">{name}</h2>
          {price > 0 && <ListingCardPrices price={price} unitsAvailable={unitsAvailable} />}
        </Link>
      </div>
    )
  }
}

export default ListingCard
