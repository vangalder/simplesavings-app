# AWS Application Deployment Plan

## Configuration Placeholders

**Required Configuration Values** (to be provided before deployment):
- **Custom Domain**: `[YOUR_CUSTOM_DOMAIN]`
- **S3 Bucket Name**: `[YOUR_S3_BUCKET_NAME]`
- **Domain Registrar**: `[YOUR_DOMAIN_REGISTRAR]` (e.g., Route 53, GoDaddy, Namecheap, Google Domains)
- **Google Analytics Property Measurement ID**: `[YOUR_GA_MEASUREMENT_ID]`
- **CloudWatch Alert Email**: `[YOUR_ALERT_EMAIL_ADDRESS]`

---

## C: Concise Problem Definition

Deploy a scalable, reliable web application on AWS with:
- Global content delivery and static hosting
- Automated SSL/TLS certificate management (never expires)
- Real-time monitoring with immediate alerting
- Analytics integration
- High availability across multiple Availability Zones

**Non-negotiable constraints**:
- All AWS operations via AWS CLI
- SSL certificates must function continuously (ACM with automated renewals)
- Zero preventable downtime
- Monitor both service availability and client-side errors (4xxErrorCount)
- Route CLI output to temporary JSON files if parsing issues occur; delete after use

---

## L: Logical Deployment Sequence

### Phase 1: Static Hosting Foundation

**Objective**: Deploy static assets with CDN, SSL, and analytics

**Sequential Steps**:
1. Request and confirm all configuration placeholders
2. Create S3 bucket: `aws s3api create-bucket --bucket [YOUR_S3_BUCKET_NAME] --region us-east-1`
3. Upload files: `aws s3 cp ./dist s3://[YOUR_S3_BUCKET_NAME]/ --recursive`
4. Enable static hosting: `aws s3 website s3://[YOUR_S3_BUCKET_NAME]/ --index-document index.html`
5. Request ACM certificate: `aws acm request-certificate --domain-name [YOUR_CUSTOM_DOMAIN] --validation-method DNS`
6. Create CloudFront distribution with ACM certificate attachment
7. Embed Google Analytics using confirmed Property Measurement ID
8. Configure DNS based on registrar:
   - **Route 53**: `aws route53 change-resource-record-sets` (programmatic ALIAS)
   - **Other registrars**: Provide specific CNAME/ALIAS instructions

**Examples**:
- **Route 53 DNS**: ALIAS record `www.[YOUR_CUSTOM_DOMAIN]` → CloudFront distribution DNS name
- **GoDaddy DNS**: CNAME `www` → `d1234567890.cloudfront.net`
- **Namecheap DNS**: CNAME `www` → `d1234567890.cloudfront.net`
- **Google Domains DNS**: CNAME `www` → `d1234567890.cloudfront.net`

**Edge Cases**:
- Certificate validation may take 30+ minutes; monitor status
- DNS propagation delays: 24-48 hours for full global propagation
- CloudFront distribution creation: 15-20 minutes for initial deployment

**Context Management**:
- Create `prep/CONFIGURATION-AND-CLI.md` documenting all configuration values and CLI commands
- Create `.cursor/rules/project-guidelines.md` with project-specific guidelines

### Phase 2: Monitoring and Alerting

**Objective**: Configure proactive monitoring with immediate email notifications

**Sequential Steps**:
1. Create SNS topic: `aws sns create-topic --name app-alerts`
2. Subscribe email: `aws sns subscribe --topic-arn <arn> --protocol email --notification-endpoint [YOUR_ALERT_EMAIL_ADDRESS]`
3. Confirm email subscription (check inbox)
4. Create uptime alarm: Monitor `HealthyHostCount` or `Availability` metric
5. Create error alarm: Monitor `4xxErrorCount` metric (threshold: 10 errors in 5 minutes)
6. Test alarms: `aws cloudwatch set-alarm-state --alarm-name app-uptime-alarm --state-value ALARM --state-reason "Testing"`

**Example Alarm Configuration**:
```bash
# Uptime alarm
aws cloudwatch put-metric-alarm \
  --alarm-name app-uptime-alarm \
  --metric-name HealthyHostCount \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:app-alerts

# Error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name app-4xx-errors \
  --metric-name 4xxErrorCount \
  --namespace AWS/CloudFront \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:app-alerts
```

**Edge Cases**:
- False positives: Adjust thresholds based on baseline traffic patterns
- Email delivery delays: SNS notifications typically arrive within 1-2 minutes
- Multiple alarm triggers: Consider alarm state transitions to avoid notification spam

### Phase 3: Backend Infrastructure (Optional)

**Objective**: Deploy serverless backend with database and load balancing

**Sequential Steps**:
1. Confirm custom domain for ALB (may use subdomain like `api.[YOUR_CUSTOM_DOMAIN]`)
2. Create ECS cluster: `aws ecs create-cluster --cluster-name app-cluster`
3. Register task definition: `aws ecs register-task-definition --cli-input-json file://task-definition.json`
4. Create service with multi-AZ: `aws ecs create-service --cluster app-cluster --service-name app-service --task-definition app-task --desired-count 2 --launch-type FARGATE`
5. Create DynamoDB table: `aws dynamodb create-table --table-name app-table --billing-mode PAY_PER_REQUEST`
6. Create ALB with ACM certificate: `aws elbv2 create-load-balancer --name app-alb --subnets subnet-123 subnet-456`
7. Configure ALB DNS (Route 53 programmatic or registrar-specific instructions)
8. Extend CloudWatch alarms to ALB metrics

**Example Service Configuration**:
- Fargate tasks: 2 tasks minimum across 2+ Availability Zones
- ALB health checks: Every 30 seconds, 3 consecutive failures = unhealthy
- Auto-scaling: 2-10 tasks based on CPU utilization (70% threshold)

**Edge Cases**:
- Task startup time: 1-2 minutes for Fargate tasks to become healthy
- ALB target registration: Targets must pass health checks before receiving traffic
- DynamoDB throttling: Use on-demand billing to avoid capacity planning

### Phase 4: Observability

**Objective**: Enhance monitoring with distributed tracing and log aggregation

**Sequential Steps**:
1. Configure CloudWatch Logs: Enable log groups for application containers
2. Set up X-Ray: `aws xray create-group --group-name app-tracing`
3. Integrate X-Ray SDK in application code
4. Create CloudWatch dashboards for visualization
5. Configure log retention: `aws logs put-retention-policy --log-group-name /ecs/app --retention-in-days 7`

**Example X-Ray Configuration**:
- Sampling rate: 10% for cost efficiency (adjust based on traffic)
- Trace segments: API Gateway, Lambda, Fargate services
- Annotations: Include custom metadata (user ID, request type)

**Edge Cases**:
- X-Ray sampling overhead: High sampling rates increase latency
- Log storage costs: Set retention policies to control costs
- Dashboard refresh: CloudWatch dashboards update every 1 minute

### Phase 5: Infrastructure as Code

**Objective**: Version control infrastructure and enable reproducible deployments

**Sequential Steps**:
1. Initialize CDK project: `cdk init app --language typescript`
2. Define stack with all resources (S3, CloudFront, ACM, Fargate, DynamoDB, ALB, Route 53, CloudWatch alarms)
3. Parameterize all configuration values (domain, bucket, GA ID, email)
4. Deploy: `cdk deploy --parameters domain=[YOUR_CUSTOM_DOMAIN]`
5. Validate: Verify all resources created correctly

**Example CDK Structure**:
```typescript
// Stack parameters
const domain = new CfnParameter(this, 'Domain', { type: 'String' });
const bucketName = new CfnParameter(this, 'BucketName', { type: 'String' });
const gaId = new CfnParameter(this, 'GoogleAnalyticsId', { type: 'String' });
const alertEmail = new CfnParameter(this, 'AlertEmail', { type: 'String' });
```

**Edge Cases**:
- Stack updates: Some changes require resource replacement (e.g., ALB name changes)
- Rollback scenarios: CloudFormation automatically rolls back on failure
- Parameter validation: Validate inputs before deployment

---

## A: Adaptation and Iteration

**Refinement Process**:
1. After each phase, verify:
   - SSL certificate status: `aws acm list-certificates --query 'CertificateSummaryList[*].[DomainName,Status]'`
   - CloudWatch alarms active: `aws cloudwatch describe-alarms --alarm-names app-uptime-alarm app-4xx-errors`
   - DNS resolution: `dig [YOUR_CUSTOM_DOMAIN]` or `nslookup [YOUR_CUSTOM_DOMAIN]`
   - Application accessibility: `curl -I https://[YOUR_CUSTOM_DOMAIN]`
2. Document deviations in `@prep/CONFIGURATION-AND-CLI.md`
3. Update `.cursor/rules/project-guidelines.md` with lessons learned

**Iteration Examples**:
- **Certificate validation failure**: Re-request certificate or manually add DNS validation records
- **CloudWatch alarm tuning**: Adjust thresholds based on actual traffic patterns
- **DNS propagation issues**: Wait 24-48 hours or use DNS propagation checker tools
- **ALB health check failures**: Verify security groups allow traffic, check application logs

**Error Recovery Scenarios**:
- **SSL certificate expiration**: ACM auto-renews, but verify renewal status quarterly
- **CloudFront cache issues**: Invalidate cache: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`
- **Fargate task failures**: Check CloudWatch Logs, verify task definition, review security groups

---

## R: Results and Validation

**Deployment Success Criteria**:
1. ✅ Application accessible via `https://[YOUR_CUSTOM_DOMAIN]` with valid SSL certificate
2. ✅ CloudWatch alarms configured and tested (uptime + 4xxErrorCount)
3. ✅ Email notifications received and verified for alarm triggers
4. ✅ Google Analytics tracking active (verify in GA dashboard)
5. ✅ Multi-AZ deployment confirmed (if backend deployed)
6. ✅ Infrastructure defined as code (CDK/CloudFormation templates)
7. ✅ All temporary files cleaned up
8. ✅ Context documented in `@prep/CONFIGURATION-AND-CLI.md` and `.cursor`

**Validation Commands**:
```bash
# Verify SSL certificate
aws acm list-certificates --query 'CertificateSummaryList[*].[DomainName,Status,KeyAlgorithm]'

# Test CloudWatch alarm
aws cloudwatch set-alarm-state \
  --alarm-name app-uptime-alarm \
  --state-value ALARM \
  --state-reason "Manual test"

# Verify CloudFront distribution
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Status,Enabled]'

# Check DNS resolution
dig [YOUR_CUSTOM_DOMAIN] +short
nslookup [YOUR_CUSTOM_DOMAIN]

# Verify application accessibility
curl -I https://[YOUR_CUSTOM_DOMAIN]
```

**Business Requirements Alignment**:
- **Scalability**: Auto-scaling configured for traffic growth
- **Reliability**: Multi-AZ deployment with health checks
- **Security**: SSL/TLS encryption, IAM roles with least privilege
- **Cost-effectiveness**: Pay-per-request DynamoDB, Fargate serverless pricing
- **Observability**: CloudWatch, X-Ray, and Google Analytics integration
- **Maintainability**: Infrastructure as code for version control and reproducibility

---

## Context Management

**Required Documentation**:
- `@prep/CONFIGURATION-AND-CLI.md`: Configuration values, CLI commands, deployment history, deviations
- `.cursor`: Project-specific guidelines, naming conventions, monitoring requirements, AWS CLI usage patterns

**Version Control**:
- Remind user to commit after major milestones
- Never commit without explicit user approval
- Clean up temporary files (including JSON CLI output files) after each phase

**File Management**:
- Delete temporary JSON files used for CLI output parsing
- Remove temporary scripts and configuration files after use
- Keep only production-ready code and infrastructure definitions

---

## Notes

- **CLI Output Issues**: Route output to temporary JSON files if parsing fails; delete after use
- **DNS Registrar Support**: Route 53 = programmatic configuration; others = manual CNAME/ALIAS instructions
- **Email Defaults**: Use provided email address unless user specifies alternative
- **SSL Priority**: SSL certificates are non-negotiable and must function from deployment onward
- **Monitoring**: Both uptime and 4xxErrorCount monitoring are required for complete observability
