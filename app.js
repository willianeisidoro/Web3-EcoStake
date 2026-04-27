// ==========================================
// CONFIG
// ==========================================
const SEPOLIA_CHAIN_ID = 11155111;

const CONTRACTS = {
    NFT: "0xd9Bb2A48068FD31Fae8Bb1AD7b2481fDbbFdC672",
    TOKEN: "0x918b71998BE522F491BC390C5De9d45A4c0EC030",
    STAKING: "0xB55dF5771eE5526e5Cdf5e97Ae7517D0bF42FDAb",
    DAO: "0xaB57FbaFE1e6f8369DC502699aF03400c5b10144"
};

const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

const MOCK_TOKEN_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/certificate.json";

const MOCK_PROPOSALS = [
    { id: 0, title: "Plantar 10.000 Árvores", description: "Reflorestamento." },
    { id: 1, title: "Energia Solar", description: "Painéis em escolas." },
    { id: 2, title: "Reciclagem", description: "Centros de coleta." }
];

// ==========================================
// ABIs
// ==========================================
const NFT_ABI = [
    "function mintCertificate(address to, string memory tokenURI) public returns (uint256)"
];

const TOKEN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

const STAKING_ABI = [
    "function stake(uint256 amount) external",
    "function unstake() external",
    "function calculateReward(address user) public view returns (uint256)",
    "function stakedBalance(address) public view returns (uint256)",
    "function configured() public view returns (bool)",
    "function setConfig(address,address) external"
];

const DAO_ABI = [
    "function vote(uint256 proposalId) external"
];

// ==========================================
// STATE
// ==========================================
let provider, signer, userAddress;

// ==========================================
// UI HELPERS
// ==========================================
function showStatus(id, msg, type = "info") {
    document.getElementById(id).innerText = msg;
}

function clearStatus(id) {
    document.getElementById(id).innerText = "";
}

// ==========================================
// CORE
// ==========================================
async function connect() {
    if (!window.ethereum) return alert("Instale o MetaMask");

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById('walletAddress').innerText =
        userAddress.slice(0,6) + "..." + userAddress.slice(-4);

    if (!(await checkNetwork())) return;

    await ensureStakingConfigured();
    enableActions();
    await updateData();
    renderProposals();
}

async function checkNetwork() {
    const { chainId } = await provider.getNetwork();
    if (chainId !== SEPOLIA_CHAIN_ID) {
        alert("Troque para Sepolia");
        return false;
    }
    return true;
}

function enableActions() {
    document.getElementById('mintButton').disabled = false;
    document.getElementById('investButton').disabled = false;
    document.getElementById('unstakeButton').disabled = false;
}

// ==========================================
// CONFIG AUTOMÁTICA DO STAKING
// ==========================================
async function ensureStakingConfigured() {
    const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

    try {
        const configured = await staking.configured();
        if (configured) return;

        showStatus("stakeStatus", "Configurando staking...");

        const tx = await staking.setConfig(CONTRACTS.TOKEN, PRICE_FEED);
        await tx.wait();

        showStatus("stakeStatus", "✅ Staking configurado!");
    } catch (e) {
        console.log("Provavelmente você não é owner (ok em produção)");
    }
}

// ==========================================
// DATA
// ==========================================
async function updateData() {
    const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, provider);
    const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, provider);

    try {
        const balance = await token.balanceOf(userAddress);
        const staked = await staking.stakedBalance(userAddress);
        const reward = await staking.calculateReward(userAddress);

        document.getElementById("tokenBalance").innerText =
            ethers.utils.formatEther(balance);

        document.getElementById("stakedBalance").innerText =
            ethers.utils.formatEther(staked);

        document.getElementById("estimatedReward").innerText =
            ethers.utils.formatEther(reward);
    } catch (e) {
        console.log("Erro ao atualizar dados");
    }
}

// ==========================================
// NFT
// ==========================================
async function mintNFT() {
    clearStatus("nftStatus");

    try {
        showStatus("nftStatus", "Mintando NFT...");

        const contract = new ethers.Contract(CONTRACTS.NFT, NFT_ABI, signer);
        const tx = await contract.mintCertificate(userAddress, MOCK_TOKEN_URI);

        await tx.wait();

        showStatus("nftStatus", "✅ NFT criado!");
    } catch (e) {
        showStatus("nftStatus", "Erro ao mintar NFT");
    }
}

// ==========================================
// STAKE
// ==========================================
async function investTokens() {
    const amount = document.getElementById("stakeAmount").value;
    if (!amount) return;

    clearStatus("stakeStatus");

    try {
        const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, signer);
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

        const value = ethers.utils.parseEther(amount);

        showStatus("stakeStatus", "Aprovando...");
        const tx1 = await token.approve(CONTRACTS.STAKING, value);
        await tx1.wait();

        showStatus("stakeStatus", "Fazendo stake...");
        const tx2 = await staking.stake(value);
        await tx2.wait();

        showStatus("stakeStatus", "✅ Stake feito!");

        await updateData();
    } catch (e) {
        showStatus("stakeStatus", "Erro no stake");
    }
}

async function unstakeTokens() {
    clearStatus("stakeStatus");

    try {
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

        showStatus("stakeStatus", "Retirando...");
        const tx = await staking.unstake();
        await tx.wait();

        showStatus("stakeStatus", "✅ Retirado!");

        await updateData();
    } catch (e) {
        showStatus("stakeStatus", "Erro no unstake");
    }
}

// ==========================================
// DAO
// ==========================================
async function vote(id) {
    clearStatus("daoStatus");

    try {
        showStatus("daoStatus", "Votando...");

        const dao = new ethers.Contract(CONTRACTS.DAO, DAO_ABI, signer);
        const tx = await dao.vote(id);

        await tx.wait();

        showStatus("daoStatus", "✅ Voto registrado!");
    } catch (e) {
        showStatus("daoStatus", "Erro ao votar");
    }
}

// ==========================================
// UI DAO
// ==========================================
function renderProposals() {
    const list = document.getElementById("proposalsList");
    list.innerHTML = "";

    MOCK_PROPOSALS.forEach(p => {
        const div = document.createElement("div");

        div.innerHTML = `
            <p><b>${p.title}</b></p>
            <p>${p.description}</p>
            <button onclick="vote(${p.id})">Votar</button>
        `;

        list.appendChild(div);
    });
}

// ==========================================
// EVENTS
// ==========================================
document.getElementById("connectButton").onclick = connect;
document.getElementById("mintButton").onclick = mintNFT;
document.getElementById("investButton").onclick = investTokens;
document.getElementById("unstakeButton").onclick = unstakeTokens;