// ==========================================
// Configurações e ABIs
// ==========================================
const SEPOLIA_CHAIN_ID = 11155111;

const NFT_ABI = [
    "function mintCertificate(address to, string memory tokenURI) public returns (uint256)"
];
const TOKEN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];
const STAKING_ABI = [
    "function stake(uint256 amount) external",
    "function unstake() external",
    "function calculateReward(address user) public view returns (uint256)",
    "function stakedBalance(address) public view returns (uint256)"
];
const DAO_ABI = [
    "function vote(uint256 proposalId) external"
];

// ATENÇÃO: Substitua pelos endereços reais dos seus contratos na Sepolia
const CONTRACTS = {
    NFT: "0xd9Bb2A48068FD31Fae8Bb1AD7b2481fDbbFdC672",
    TOKEN: "0x918b71998BE522F491BC390C5De9d45A4c0EC030",
    STAKING: "0xB55dF5771eE5526e5Cdf5e97Ae7517D0bF42FDAb",
    DAO: "0xaB57FbaFE1e6f8369DC502699aF03400c5b10144"
};

const MOCK_TOKEN_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/certificate.json";

const MOCK_PROPOSALS = [
    { id: 0, title: "Plantar 10.000 Árvores", description: "Reflorestamento em áreas degradadas." },
    { id: 1, title: "Energia Solar Comunitária", description: "Instalação de painéis em escolas." },
    { id: 2, title: "Reciclagem Avançada", description: "Novos centros de coleta seletiva." }
];

// ==========================================
// Variáveis de Estado
// ==========================================
let provider, signer, userAddress;

// ==========================================
// Funções de UI
// ==========================================
function showStatus(elementId, message, type = 'info', txHash = null) {
    const container = document.getElementById(elementId);
    let html = `<div class="status-message status-${type}">`;
    if (type === 'info') html += `<span class="spinner"></span> `;
    html += `${message}</div>`;
    
    if (txHash) {
        html += `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" class="tx-link">🔗 Ver no Etherscan</a>`;
    }
    container.innerHTML = html;
}

function clearStatus(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

// ==========================================
// Core Web3
// ==========================================
async function checkNetwork() {
    const { chainId } = await provider.getNetwork();
    const warning = document.getElementById('networkWarning');
    if (chainId !== SEPOLIA_CHAIN_ID) {
        warning.classList.remove('hidden');
        return false;
    }
    warning.classList.add('hidden');
    return true;
}

async function connect() {
    if (!window.ethereum) return alert("Instale o MetaMask!");

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        document.getElementById('walletAddress').innerText = `${userAddress.substring(0,6)}...${userAddress.substring(38)}`;
        const connectBtn = document.getElementById('connectButton');
        connectBtn.innerText = "Carteira Conectada";
        connectBtn.disabled = true;

        if (await checkNetwork()) {
            enableActions();
            await updateData();
            renderProposals();
        }

        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('accountsChanged', () => window.location.reload());
    } catch (e) {
        console.error(e);
    }
}

function enableActions() {
    document.getElementById('mintButton').disabled = false;
    document.getElementById('investButton').disabled = false;
    document.getElementById('unstakeButton').disabled = false;
}

async function updateData() {
    if (!userAddress) return;
    try {
        const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, provider);
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, provider);

        const [balance, staked, reward] = await Promise.all([
            token.balanceOf(userAddress),
            staking.stakedBalance(userAddress),
            staking.calculateReward(userAddress)
        ]);

        document.getElementById('tokenBalance').innerText = `${ethers.utils.formatEther(balance)} ESG`;
        document.getElementById('stakedBalance').innerText = `${ethers.utils.formatEther(staked)} ESG`;
        document.getElementById('estimatedReward').innerText = `${ethers.utils.formatEther(reward)} ESG`;
    } catch (e) {
        console.error("Erro ao atualizar dados:", e);
    }
}

// ==========================================
// Ações On-Chain
// ==========================================

async function mintNFT() {
    clearStatus('nftStatus');
    try {
        showStatus('nftStatus', 'Preparando emissão...', 'info');
        const contract = new ethers.Contract(CONTRACTS.NFT, NFT_ABI, signer);
        const tx = await contract.mintCertificate(userAddress, MOCK_TOKEN_URI);
        showStatus('nftStatus', 'Transação enviada!', 'info', tx.hash);
        await tx.wait();
        showStatus('nftStatus', '✅ Certificado emitido com sucesso!', 'success', tx.hash);
    } catch (e) {
        showStatus('nftStatus', '❌ Erro ao emitir certificado.', 'error');
    }
}

async function investTokens() {
    const amount = document.getElementById('stakeAmount').value;
    if (!amount || amount <= 0) return;
    
    clearStatus('stakeStatus');
    const amountWei = ethers.utils.parseEther(amount);

    try {
        const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, signer);
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

        showStatus('stakeStatus', 'Passo 1/2: Autorizando investimento...', 'info');
        const txApprove = await token.approve(CONTRACTS.STAKING, amountWei);
        await txApprove.wait();

        showStatus('stakeStatus', 'Passo 2/2: Confirmando investimento...', 'info', txApprove.hash);
        const txStake = await staking.stake(amountWei);
        showStatus('stakeStatus', 'Finalizando investimento...', 'info', txStake.hash);
        await txStake.wait();

        showStatus('stakeStatus', '✅ Investimento concluído!', 'success', txStake.hash);
        await updateData();
    } catch (e) {
        showStatus('stakeStatus', '❌ Erro no processo de investimento.', 'error');
    }
}

async function unstakeTokens() {
    clearStatus('stakeStatus');
    try {
        showStatus('stakeStatus', 'Preparando resgate...', 'info');
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);
        const tx = await staking.unstake();
        showStatus('stakeStatus', 'Resgatando fundos...', 'info', tx.hash);
        await tx.wait();
        showStatus('stakeStatus', '✅ Resgate concluído com sucesso!', 'success', tx.hash);
        await updateData();
    } catch (e) {
        showStatus('stakeStatus', '❌ Erro ao resgatar fundos.', 'error');
    }
}

async function vote(id) {
    clearStatus('daoStatus');
    try {
        showStatus('daoStatus', `Enviando voto para proposta #${id}...`, 'info');
        const dao = new ethers.Contract(CONTRACTS.DAO, DAO_ABI, signer);
        const tx = await dao.vote(id);
        showStatus('daoStatus', 'Voto em processamento...', 'info', tx.hash);
        await tx.wait();
        showStatus('daoStatus', '✅ Voto computado!', 'success', tx.hash);
    } catch (e) {
        showStatus('daoStatus', '❌ Erro ao votar. Verifique se você já votou.', 'error');
    }
}

// ==========================================
// Inicialização
// ==========================================
function renderProposals() {
    const list = document.getElementById('proposalsList');
    list.innerHTML = '';
    MOCK_PROPOSALS.forEach(p => {
        const div = document.createElement('div');
        div.className = 'proposal-card';
        div.innerHTML = `
            <div class="proposal-info">
                <h4>#${p.id} - ${p.title}</h4>
                <p>${p.description}</p>
            </div>
            <button class="btn-secondary" onclick="vote(${p.id})">Votar</button>
        `;
        list.appendChild(div);
    });
}

document.getElementById('connectButton').addEventListener('click', connect);
document.getElementById('mintButton').addEventListener('click', mintNFT);
document.getElementById('investButton').addEventListener('click', investTokens);
document.getElementById('unstakeButton').addEventListener('click', unstakeTokens);
