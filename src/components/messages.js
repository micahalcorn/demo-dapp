import moment from 'moment'
import React, { Component } from 'react'
import { FormattedDate, FormattedMessage } from 'react-intl'
import { connect } from 'react-redux'

import Avatar from './avatar'
import PurchaseProgress from './purchase-progress'
import Timelapse from './timelapse'

import data from '../data'
import origin from '../services/origin'

// may not be necessary when using real data
const groupByArray = (xs, key) => {
  return xs.reduce((rv, x) => {
    let v = key instanceof Function ? key(x) : x[key]
    let el = rv.find((r) => r && r.key === v)

    if (el) {
      el.values.push(x)
    } else {
      rv.push({ key: v, values: [x] })
    }

    return rv
  }, [])
}

class Messages extends Component {
  constructor(props) {
    super(props)

    const dialogues = groupByArray(data.messages, 'dialogueId')
    const mostRecent = dialogues[0] || {}

    this.state = {
      counterparty: {},
      dialogues,
      listing: null,
      purchase: null,
      selectedDialogueId: mostRecent.key,
    }
  }

  componentDidMount() {
    this.identifyCounterparty()
    this.loadListing()
  }

  componentDidUpdate(prevProps, prevState) {
    const { selectedDialogueId } = this.state

    // on new dialogue selection
    if (selectedDialogueId && selectedDialogueId !== prevState.selectedDialogueId) {
      this.identifyCounterparty()
      this.loadListing()
    }
  }

  async findPurchase() {
    const { web3Account } = this.props
    const { counterparty, listing } = this.state
    const { address, sellerAddress } = listing
    const len = await origin.listings.purchasesLength(address)
    const purchaseAddresses = await Promise.all([...Array(len).keys()].map(async i => {
      return await origin.listings.purchaseAddressByIndex(address, i)
    }))
    const purchases = await Promise.all(purchaseAddresses.map(async addr => {
      return await origin.purchases.get(addr)
    }))
    const involvingCounterparty = purchases.filter(p => p.buyerAddress === counterparty.address || p.buyerAddress === web3Account)
    const mostRecent = involvingCounterparty.sort((a, b) => a.created > b.created ? -1 : 1)[0]
    
    this.setState({ purchase: mostRecent })
  }

  identifyCounterparty() {
    const web3Account = this.props
    const { dialogues, selectedDialogueId } = this.state
    const dialogue = dialogues.find(d => d.key === selectedDialogueId)
    const { fromAddress, fromName, toAddress, toName } = dialogue.values[0]
    const counterpartyRole = fromAddress === web3Account ? 'recipient' : 'sender'

    this.setState({
      counterparty: counterpartyRole === 'recipient' ? {
        address: toAddress,
        name: toName,
      } : {
        address: fromAddress,
        name: fromName,
      },
    })
  }

  async loadListing() {
    const { dialogues, selectedDialogueId } = this.state
    // find the most recent listing context or set empty value
    const { listingId } = dialogues.find(d => d.key === selectedDialogueId)
                          .values
                          .sort((a, b) => a.createdAt < b.createdAt ? -1 : 1)
                          .find(m => m.listingId) || {}

    const listing = listingId ? (await origin.listings.get(listingId)) : null

    this.setState({ listing })

    if (listing) {
      this.findPurchase()
    }
  }

  handleDialogueSelect(selectedDialogueId) {
    this.setState({ selectedDialogueId })
  }

  render() {
    const { web3Account } = this.props
    const { dialogues, listing, purchase, selectedDialogueId } = this.state
    const { messages } = data
    const { address, name, pictures } = listing || {}
    const photo = pictures && pictures.length > 0 && (new URL(pictures[0])).protocol === "data:" && pictures[0]
    const perspective = purchase ? (purchase.buyerAddress === web3Account ? 'buyer' : 'seller') : null
    const soldAt = purchase ? purchase.created * 1000 /* convert seconds since epoch to ms */ : null

    return (
      <div className="d-flex messages-wrapper">
        <div className="container">
          <div className="row no-gutters">
            <div className="dialogues-list-col col-12 col-sm-4 col-lg-3">
              {dialogues.map(d => {
                const lastMessage = d.values.sort((a, b) => a.createdAt < b.createdAt ? -1 : 1)[d.values.length - 1]
                const { content, createdAt, fromAddress, fromName, toAddress, toName } = lastMessage
                const role = fromAddress === web3Account ? 'sender' : 'recipient'
                const counterparty = role === 'sender' ? {
                  address: toAddress,
                  name: toName,
                } : {
                  address: fromAddress,
                  name: fromName,
                }
                const unreadCount = d.values.filter(m => !m.readAt).length

                return (
                  <div
                    key={d.key}
                    onClick={() => this.handleDialogueSelect(d.key)}
                    className={`d-flex dialogue-list-item${selectedDialogueId === d.key ? ' active' : ''}`}
                  >
                    <Avatar placeholderStyle="blue" />
                    <div className="content-container text-truncate">
                      <div className="sender text-truncate">
                        {counterparty.name || counterparty.address}
                      </div>
                      <div className="message text-truncate">
                        {content}
                      </div>
                    </div>
                    <div className="meta-container text-right">
                      <div className="time-reference text-right">
                        <Timelapse abbreviated={true} reactive={false} reference={createdAt} />
                      </div>
                      {!!unreadCount &&
                        <div className="unread count text-right">
                          <div className="d-inline-block">{unreadCount}</div>
                        </div>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="dialogue-col col-12 col-sm-8 col-lg-9">
              {listing &&
                <div className="listing-summary d-flex">
                  <div className="aspect-ratio">
                    <div className={`${photo ? '' : 'placeholder '}image-container d-flex justify-content-center`}>
                      <img src={photo || 'images/default-image.svg'} role="presentation" />
                    </div>
                  </div>
                  <div className="content-container d-flex flex-column">
                    {purchase &&
                      <div className="brdcrmb">
                        {perspective === 'buyer' &&
                          <FormattedMessage
                            id={ 'purchase-detail.purchasedFrom' }
                            defaultMessage={ 'Purchased from {sellerLink}' }
                            values={{ sellerLink: <Link to={`/users/${this.state.counterparty.address}`}>{this.state.counterparty.name}</Link> }}
                          />
                        }
                        {perspective === 'seller' &&
                          <FormattedMessage
                            id={ 'purchase-detail.soldTo' }
                            defaultMessage={ 'Sold to {buyerLink}' }
                            values={{ buyerLink: <Link to={`/users/${this.state.counterparty.address}`}>{this.state.counterparty.name}</Link> }}
                          />
                        }
                      </div>
                    }
                    <h1>{name}</h1>
                    {purchase &&
                      <div className="state">
                        {perspective === 'buyer' &&
                          <FormattedMessage
                            id={ 'purchase-detail.purchasedFromOn' }
                            defaultMessage={ 'Purchased from {sellerName} on {date}' }
                            values={{ sellerName: this.state.counterparty.name, date: <FormattedDate value={soldAt} /> }}
                          />
                        }
                        {perspective === 'seller' &&
                          <FormattedMessage
                            id={ 'purchase-detail.soldToOn' }
                            defaultMessage={ 'Sold to {buyerName} on {date}' }
                            values={{ buyerName: this.state.counterparty.name, date: <FormattedDate value={soldAt} /> }}
                          />
                        }
                      </div>
                    }
                    {purchase &&
                      <PurchaseProgress
                        purchase={purchase}
                        perspective={perspective}
                        subdued={true}
                      />
                    }
                  </div>
                </div>
              }
              <div className="dialogue">
                {messages.filter(m => m.dialogueId === selectedDialogueId)
                  .sort((a, b) => a.createdAt < b.createdAt ? -1 : 1)
                  .map(m => {
                    return (
                      <div key={`${m.createdAt.toISOString()}:${m.fromAddress}:${m.toAddress}`} className="d-flex message">
                        <Avatar placeholderStyle="blue" />
                        <div className="content-container">
                          <div className="sender">
                            {m.fromName || m.fromAddress}
                          </div>
                          <div className="message">
                            {m.content}
                          </div>
                        </div>
                        <div className="timestamp text-right">
                          {moment(m.createdAt).format('MMM Do h:mm a')}
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    web3Account: state.app.web3.account,
  }
}

export default connect(mapStateToProps)(Messages)
