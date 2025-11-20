import os
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class HederaBlockchainService:
    def __init__(self):
        """Initialize Hedera blockchain service"""
        self.hedera_service_url = os.getenv('HEDERA_SERVICE_URL', 'http://localhost:5000')
        self.network = os.getenv('HEDERA_NETWORK', 'testnet')
        self.timeout = httpx.Timeout(30.0, connect=10.0)

        logger.info(f"Hedera Service URL: {self.hedera_service_url}")
        logger.info(f"Network: {self.network}")

    async def is_connected(self) -> bool:
        """Check if Hedera service is accessible"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.hedera_service_url}/health")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Hedera service connection failed: {e}")
            return False

    async def get_contract_info(self) -> Dict[str, Any]:
        """Get contract information"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/info"
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get contract info: {e}")
            raise

    async def create_proposal_on_blockchain(self, proposal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a proposal on Hedera blockchain"""
        try:
            analysis_data = proposal_data['analysisData']
            end_date_str = proposal_data['endDate']
            try:
                parsed_date = datetime.strptime(end_date_str, "%B %d, %Y")
                end_of_day = parsed_date.replace(hour=23, minute=59, second=59)
                end_timestamp = int(end_of_day.timestamp())
            except:
                end_timestamp = int(datetime.now().timestamp() + 30 * 24 * 3600)

            current_time = int(datetime.now().timestamp())
            buffer_time = 3600

            if end_timestamp <= current_time + buffer_time:
                logger.warning(f"End date too close, adding 30 days + buffer")
                end_timestamp = current_time + (30 * 24 * 3600) + buffer_time

            ndvi_before = int(float(analysis_data.get('ndviBefore', 0)) * 1e8)
            ndvi_after = int(float(analysis_data.get('ndviAfter', 0)) * 1e8)
            pm25_before = int(float(analysis_data.get('pm25Before', 0)) * 1e8)
            pm25_after = int(float(analysis_data.get('pm25After', 0)) * 1e8)
            pm25_increase = int(float(analysis_data.get('pm25IncreasePercent', 0)) * 1e8)

            ndvi_before_val = float(analysis_data.get('ndviBefore', 0))
            ndvi_after_val = float(analysis_data.get('ndviAfter', 0))
            vegetation_loss = int((ndvi_before_val - ndvi_after_val) * 100 * 1e8) if ndvi_before_val and ndvi_after_val else 0

            demographics = analysis_data.get('demographics', {})
            children = int(demographics.get('kids', 0))
            adults = int(demographics.get('adults', 0))
            seniors = int(demographics.get('seniors', 0))
            total_affected = int(analysis_data.get('affectedPopulation10MinWalk', 0))

            description = proposal_data.get('frontendDescription',
                f"This park provides green space for the community. Its removal would impact air quality and vegetation health."
            )

            blockchain_summary = await self._generate_blockchain_summary(
                proposal_data['proposalSummary'],
                analysis_data
            )

            creator_address = proposal_data.get('creator', None)
            hedera_payload = {
                "parkName": proposal_data['parkName'],
                "parkId": proposal_data['parkId'],
                "description": description,
                "endDate": end_timestamp,
                "environmentalData": {
                    "ndviBefore": ndvi_before,
                    "ndviAfter": ndvi_after,
                    "pm25Before": pm25_before,
                    "pm25After": pm25_after,
                    "pm25IncreasePercent": pm25_increase,
                    "vegetationLossPercent": vegetation_loss
                },
                "demographics": {
                    "children": children,
                    "adults": adults,
                    "seniors": seniors,
                    "totalAffectedPopulation": total_affected
                },
                "creator": creator_address
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/create-proposal",
                    json=hedera_payload
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return {
                    'success': True,
                    'proposal_id': result.get('proposalId', result.get('proposal_id', 0)),
                    'transaction_hash': result.get('transactionId'),
                    'status': result.get('status'),
                    'explorer_url': f"https://hashscan.io/{self.network}/transaction/{result.get('transactionId')}",
                    'email_summary': blockchain_summary
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }

        except Exception as e:
            logger.error(f"Failed to create proposal: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    async def get_proposal(self, proposal_id: int) -> Optional[Dict[str, Any]]:
        """Get proposal from blockchain"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/proposal/{proposal_id}"
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return self._parse_hedera_proposal(result.get('proposal'))
            return None

        except httpx.HTTPStatusError as e:
            if e.response.status_code != 404:
                logger.error(f"Failed to get proposal {proposal_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to get proposal {proposal_id}: {e}")
            return None

    async def get_all_active_proposals(self) -> List[int]:
        """Get all active proposal IDs"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/proposals/active"
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return result.get('proposalIds', [])
            return []

        except Exception as e:
            logger.error(f"Failed to get active proposals: {e}")
            return []

    async def get_all_accepted_proposals(self) -> List[int]:
        """Get all accepted proposal IDs"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/proposals/accepted"
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return result.get('proposalIds', [])
            return []

        except Exception as e:
            logger.error(f"Failed to get accepted proposals: {e}")
            return []

    async def get_all_rejected_proposals(self) -> List[int]:
        """Get all rejected proposal IDs"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/proposals/rejected"
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return result.get('proposalIds', [])
            return []

        except Exception as e:
            logger.error(f"Failed to get rejected proposals: {e}")
            return []

    async def has_user_voted(self, proposal_id: int, user_address: str) -> bool:
        """Check if user has voted"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/has-voted/{proposal_id}/{user_address}"
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return result.get('hasVoted', False)
            return False

        except Exception as e:
            logger.error(f"Failed to check if user voted: {e}")
            return False

    async def submit_vote(self, proposal_id: int, vote: bool, voter_address: str) -> Dict[str, Any]:
        """Submit a vote"""
        try:
            payload = {
                "proposalId": proposal_id,
                "vote": vote,
                "voter": voter_address
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/vote",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return {
                    'success': True,
                    'transaction_hash': result.get('transactionId'),
                    'explorer_url': f"https://hashscan.io/{self.network}/transaction/{result.get('transactionId')}"
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }

        except Exception as e:
            logger.error(f"Failed to submit vote: {e}")
            return {'success': False, 'error': str(e)}

    async def _generate_blockchain_summary(self, full_summary: str, analysis_data: Dict) -> str:
        """Generate a concise summary for blockchain storage"""
        try:
            from google import genai

            client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

            prompt = f"""Create a neutral data summary for a park proposal focusing only on NDVI and PM2.5 metrics.

Key data points to include:
- Park name: {analysis_data.get('parkName', 'Unknown')}
- NDVI change: {analysis_data.get('ndviBefore', 0)} → {analysis_data.get('ndviAfter', 0)}
- PM2.5 increase: {analysis_data.get('pm25IncreasePercent', 0)}%

Requirements:
- Must be between 230-240 characters exactly
- Only include NDVI and PM2.5 data
- Neutral factual tone only
- No emotional words or judgments
- Include exact numerical values

Return only the factual summary."""

            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt
            )

            summary = response.text.strip()

            if len(summary) < 230:
                summary += " Environmental impact assessment indicates significant changes."
            elif len(summary) > 240:
                summary = summary[:240]

            return summary

        except Exception as e:
            logger.warning(f"Failed to generate summary: {e}")
            park_name = analysis_data.get('parkName', 'Park')
            ndvi_before = analysis_data.get('ndviBefore', 0)
            ndvi_after = analysis_data.get('ndviAfter', 0)
            pm25_increase = analysis_data.get('pm25IncreasePercent', 0)

            return f"{park_name}: NDVI {ndvi_before}→{ndvi_after}, PM2.5 +{pm25_increase}%"

    def _parse_hedera_proposal(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Parse proposal from Hedera service format"""
        if not proposal:
            return None

        env_data = proposal.get('environmentalData', {})
        environmental_data = {
            'ndviBefore': float(env_data.get('ndviBefore', 0)) / 1e8,
            'ndviAfter': float(env_data.get('ndviAfter', 0)) / 1e8,
            'pm25Before': float(env_data.get('pm25Before', 0)) / 1e8,
            'pm25After': float(env_data.get('pm25After', 0)) / 1e8,
            'pm25IncreasePercent': float(env_data.get('pm25IncreasePercent', 0)) / 1e8,
            'vegetationLossPercent': float(env_data.get('vegetationLossPercent', 0)) / 1e8,
        }

        demographics = proposal.get('demographics', {})

        return {
            'id': proposal.get('id'),
            'parkName': proposal.get('parkName'),
            'parkId': proposal.get('parkId'),
            'description': proposal.get('description'),
            'yesVotes': proposal.get('yesVotes', 0),
            'noVotes': proposal.get('noVotes', 0),
            'endDate': proposal.get('endDate'),
            'creator': proposal.get('creator'),
            'status': proposal.get('status', 'active'),
            'environmentalData': environmental_data,
            'demographics': demographics,
        }

    async def create_chat_topic(self, session_id: str) -> Dict[str, Any]:
        """Create HCS topic for chat session"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/hcs/create-topic",
                    json={"memo": f"ParkPulse Chat Session {session_id}"}
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.info(f"Created HCS topic {result.get('topicId')} for session {session_id}")
                return {
                    'success': True,
                    'topic_id': result.get('topicId'),
                    'explorer_url': f"https://hashscan.io/{self.network}/topic/{result.get('topicId')}"
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }
        except Exception as e:
            logger.error(f"Failed to create chat topic: {e}")
            return {'success': False, 'error': str(e)}

    async def submit_chat_message(self, topic_id: str, role: str, message: str) -> Dict[str, Any]:
        """Submit chat message to HCS topic with User: or Agent: prefix"""
        try:
            formatted_message = f"{role}:{message}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/hcs/submit",
                    json={
                        "topicId": topic_id,
                        "message": formatted_message,
                        "timestamp": datetime.now().isoformat(),
                        "sessionId": topic_id
                    }
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.debug(f"Logged to HCS: {role}:{message[:50]}...")
                return {
                    'success': True,
                    'transaction_id': result.get('transactionId')
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }
        except Exception as e:
            logger.warning(f"Failed to submit chat message to HCS: {e}")
            return {'success': False, 'error': str(e)}

    async def close_proposal(self, proposal_id: int) -> Dict[str, Any]:
        """Close a proposal and finalize voting results"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/close-proposal",
                    json={"proposalId": proposal_id}
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.info(f"Closed proposal #{proposal_id}")
                return {
                    'success': True,
                    'transaction_hash': result.get('transactionId'),
                    'status': result.get('status'),
                    'explorer_url': f"https://hashscan.io/{self.network}/transaction/{result.get('transactionId')}"
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown error')}
        except Exception as e:
            logger.error(f"Failed to close proposal: {e}")
            return {'success': False, 'error': str(e)}

    async def set_funding_goal(self, proposal_id: int, goal_hbar: float) -> Dict[str, Any]:
        """Set funding goal for an accepted proposal"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/set-funding-goal",
                    json={
                        "proposalId": proposal_id,
                        "goal": goal_hbar
                    }
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.info(f"Set funding goal for proposal #{proposal_id}: {goal_hbar} HBAR")
                return {
                    'success': True,
                    'transaction_hash': result.get('transactionId'),
                    'goal': goal_hbar
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown error')}
        except Exception as e:
            logger.error(f"Failed to set funding goal: {e}")
            return {'success': False, 'error': str(e)}

    async def donate_to_proposal(self, proposal_id: int, amount_hbar: float) -> Dict[str, Any]:
        """Donate HBAR to an accepted proposal"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/donate",
                    json={
                        "proposalId": proposal_id,
                        "amount": amount_hbar
                    }
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.info(f"Donated {amount_hbar} HBAR to proposal #{proposal_id}")
                return {
                    'success': True,
                    'transaction_hash': result.get('transactionId'),
                    'amount': amount_hbar,
                    'explorer_url': f"https://hashscan.io/{self.network}/transaction/{result.get('transactionId')}"
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown error')}
        except Exception as e:
            logger.error(f"Failed to donate: {e}")
            return {'success': False, 'error': str(e)}

    async def get_donation_progress(self, proposal_id: int) -> Dict[str, Any]:
        """Get fundraising progress for a proposal"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hedera_service_url}/api/contract/donation-progress/{proposal_id}"
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                return {
                    'success': True,
                    'raised': result.get('raised', 0),
                    'goal': result.get('goal', 0),
                    'percentage': result.get('percentage', 0)
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown error')}
        except Exception as e:
            logger.error(f"Failed to get donation progress: {e}")
            return {'success': False, 'error': str(e)}

    async def withdraw_funds(self, proposal_id: int, recipient_address: str) -> Dict[str, Any]:
        """Withdraw funds from a proposal (owner only)"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.hedera_service_url}/api/contract/withdraw-funds",
                    json={
                        "proposalId": proposal_id,
                        "recipient": recipient_address
                    }
                )
                response.raise_for_status()
                result = response.json()

            if result.get('success'):
                logger.info(f"Withdrew funds from proposal #{proposal_id}")
                return {
                    'success': True,
                    'transaction_hash': result.get('transactionId'),
                    'explorer_url': f"https://hashscan.io/{self.network}/transaction/{result.get('transactionId')}"
                }
            else:
                return {'success': False, 'error': result.get('error', 'Unknown error')}
        except Exception as e:
            logger.error(f"Failed to withdraw funds: {e}")
            return {'success': False, 'error': str(e)}

BlockchainService = HederaBlockchainService
